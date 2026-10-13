import os
import pytest
from datetime import date, datetime
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.config import settings

# Force test configuration
settings.DEMO_MODE = False
settings.DATABASE_URL = "sqlite:///:memory:"

from app.database import Base, get_db
from app.models import User, PatientProfile, InsurancePolicy, Provider
from app.auth import get_password_hash, create_access_token
from main import app

# Create in-memory SQLite engine
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Test client with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_patient(db_session):
    """Seed test patient 1."""
    user = User(
        email="test_patient@example.com",
        username="test_patient",
        full_name="Aarav Test Sharma",
        hashed_password=get_password_hash("Password123!"),
        role="patient",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    profile = PatientProfile(
        user_id=user.id,
        date_of_birth=date(1988, 5, 12),
        phone="9876543210",
        address="123 Test Street, Mumbai",
        policy_number="POL-TEST-001",
        member_reference="MEM-TEST-001",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(profile)
    return user


@pytest.fixture(scope="function")
def test_patient_2(db_session):
    """Seed test patient 2."""
    user = User(
        email="test_patient2@example.com",
        username="test_patient2",
        full_name="Priya Test Patel",
        hashed_password=get_password_hash("Password123!"),
        role="patient",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    profile = PatientProfile(
        user_id=user.id,
        date_of_birth=date(1992, 8, 20),
        phone="9876543211",
        address="456 Test Road, Ahmedabad",
        policy_number="POL-TEST-002",
        member_reference="MEM-TEST-002",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(profile)
    return user


@pytest.fixture(scope="function")
def test_investigator(db_session):
    """Seed test investigator."""
    user = User(
        email="test_investigator@example.com",
        username="test_investigator",
        full_name="Vikram Investigator",
        hashed_password=get_password_hash("Password123!"),
        role="investigator",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_admin(db_session):
    """Seed test admin."""
    user = User(
        email="test_admin@example.com",
        username="test_admin",
        full_name="Anita Admin",
        hashed_password=get_password_hash("Password123!"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def patient_token(test_patient):
    return create_access_token({"sub": test_patient.id, "role": "patient", "email": test_patient.email})


@pytest.fixture(scope="function")
def patient_2_token(test_patient_2):
    return create_access_token({"sub": test_patient_2.id, "role": "patient", "email": test_patient_2.email})


@pytest.fixture(scope="function")
def investigator_token(test_investigator):
    return create_access_token({"sub": test_investigator.id, "role": "investigator", "email": test_investigator.email})


@pytest.fixture(scope="function")
def admin_token(test_admin):
    return create_access_token({"sub": test_admin.id, "role": "admin", "email": test_admin.email})


@pytest.fixture(scope="function")
def test_provider(db_session):
    """Seed test healthcare provider."""
    provider = Provider(
        name="Apollo Hospital Test",
        provider_code="PRV-TEST-01",
        specialty="Cardiology",
        hospital_type="Tertiary Care",
        address="100 Hospital Way",
        city="Chennai",
        state="Tamil Nadu",
        phone="044-12345678",
        is_flagged=False,
    )
    db_session.add(provider)
    db_session.commit()
    db_session.refresh(provider)
    return provider


@pytest.fixture(scope="function")
def test_policy(db_session, test_patient):
    """Seed active policy for test patient 1."""
    policy = InsurancePolicy(
        patient_id=test_patient.patient_profile.id,
        policy_number="POL-2024-TEST-001",
        member_reference="MEM-TEST-001",
        policy_type="individual",
        insurer_name="Star Health Insurance",
        coverage_start=date(2023, 1, 1),
        coverage_end=date(2027, 12, 31),
        max_coverage_amount=Decimal("500000.00"),
        is_active=True,
    )
    db_session.add(policy)
    db_session.commit()
    db_session.refresh(policy)
    return policy
