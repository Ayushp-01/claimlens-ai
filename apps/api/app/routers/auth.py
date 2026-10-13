from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.config import settings
from app.models import User, PatientProfile
from app.schemas import UserCreate, UserLogin, UserResponse, UserUpdate, Token
from app.auth import get_password_hash, verify_password, create_access_token
from app.dependencies import get_current_user
from app.services.audit_service import log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Self-registration for patient users."""
    # Check existing email
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    # Check existing username
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists.",
        )

    # Force role to patient for public registration
    role = "patient"

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=hashed_pw,
        role=role,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    # Automatically initialize PatientProfile
    patient_profile = PatientProfile(
        user_id=new_user.id,
    )
    db.add(patient_profile)
    db.commit()
    db.refresh(new_user)

    log_action(
        db=db,
        actor_id=new_user.id,
        action="user_registered",
        entity_type="user",
        entity_id=new_user.id,
        new_value={"username": new_user.username, "email": new_user.email, "role": role},
    )

    return new_user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with username or email and return JWT access token."""
    login_id = (
        credentials.get_identifier()
        if hasattr(credentials, "get_identifier")
        else (credentials.username_or_email or credentials.email or credentials.username or "")
    ).strip()

    # Query user by email or username (case-insensitive)
    user = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.email) == login_id.lower(),
                func.lower(User.username) == login_id.lower(),
            )
        )
        .first()
    )

    # Support demo account alias mapping if demo mode is enabled
    if not user and getattr(settings, "DEMO_MODE", False):
        normalized_id = login_id.lower()
        demo_alias_map = {
            "patient@claimlens.ai": "patient1@demo.claimlens.ai",
            "patient": "patient1@demo.claimlens.ai",
            "patient1": "patient1@demo.claimlens.ai",
            "patient2": "patient2@demo.claimlens.ai",
            "investigator@claimlens.ai": "investigator@demo.claimlens.ai",
            "investigator": "investigator@demo.claimlens.ai",
            "admin@claimlens.ai": "admin@demo.claimlens.ai",
            "admin": "admin@demo.claimlens.ai",
        }
        target_email = demo_alias_map.get(normalized_id)
        if target_email:
            user = db.query(User).filter(func.lower(User.email) == target_email.lower()).first()

    pw_matches = False
    if user:
        if verify_password(credentials.password, user.hashed_password):
            pw_matches = True
        elif getattr(settings, "DEMO_MODE", False):
            # Allowed demo passwords for convenience in demo mode
            demo_passwords = {
                "investigator@demo.claimlens.ai": ["Demo@Invest1", "password123"],
                "admin@demo.claimlens.ai": ["Demo@Admin1", "password123"],
                "patient1@demo.claimlens.ai": ["Demo@Patient1", "password123"],
                "patient2@demo.claimlens.ai": ["Demo@Patient2", "password123"],
            }
            allowed_pws = demo_passwords.get(user.email.lower(), ["password123", "Demo@Pass123"])
            if credentials.password in allowed_pws:
                pw_matches = True

    if not user or not pw_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive.",
        )

    access_token = create_access_token(
        data={"sub": user.id, "role": user.role, "email": user.email, "name": user.full_name}
    )

    log_action(
        db=db,
        actor_id=user.id,
        action="user_login",
        entity_type="user",
        entity_id=user.id,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve current authenticated user details."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update profile information for the current user."""
    old_data = {"email": current_user.email, "full_name": current_user.full_name}

    if user_update.email and user_update.email != current_user.email:
        # Check uniqueness
        if db.query(User).filter(User.email == user_update.email, User.id != current_user.id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use by another account.",
            )
        current_user.email = user_update.email

    if user_update.full_name:
        current_user.full_name = user_update.full_name

    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="user_updated_profile",
        entity_type="user",
        entity_id=current_user.id,
        old_value=old_data,
        new_value={"email": current_user.email, "full_name": current_user.full_name},
    )

    return current_user


@router.post("/logout")
def logout():
    """Client-side logout acknowledgement."""
    return {"status": "success", "message": "Logged out successfully."}
