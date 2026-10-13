import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import User, Claim, ClaimDocument, PatientProfile
from app.schemas import ClaimDocumentResponse
from app.dependencies import get_current_user
from app.services.audit_service import log_action

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload/{claim_id}", response_model=ClaimDocumentResponse)
def upload_claim_document(
    claim_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document associated with a specific claim."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    # Access control: patient must own the claim
    if current_user.role == "patient":
        patient_profile = (
            db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        )
        if not patient_profile or claim.patient_id != patient_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to upload documents for this claim.",
            )

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    claim_dir = os.path.join(settings.UPLOAD_DIR, claim_id)
    os.makedirs(claim_dir, exist_ok=True)

    timestamp = int(datetime.utcnow().timestamp())
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(claim_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    doc = ClaimDocument(
        claim_id=claim.id,
        document_type=document_type,
        filename=file.filename or "uploaded_file",
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="document_uploaded",
        entity_type="claim_document",
        entity_id=doc.id,
        new_value={"claim_id": claim.id, "document_type": document_type, "filename": doc.filename},
    )

    return doc


@router.get("/{document_id}")
def download_or_view_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download or view a specific claim document."""
    doc = db.query(ClaimDocument).filter(ClaimDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Access check: if patient, must own the claim
    if current_user.role == "patient":
        claim = doc.claim
        patient_profile = (
            db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        )
        if not patient_profile or claim.patient_id != patient_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this document.",
            )

    if not os.path.exists(doc.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found on server storage.",
        )

    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type=doc.mime_type,
    )


@router.delete("/{document_id}")
def delete_claim_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a claim document."""
    doc = db.query(ClaimDocument).filter(ClaimDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Check permission: uploader or investigator or admin
    is_uploader = doc.uploaded_by_id == current_user.id
    is_investigator = current_user.role in ["investigator", "admin"]

    if not (is_uploader or is_investigator):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this document.",
        )

    # Delete file from disk if present
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()

    log_action(
        db=db,
        actor_id=current_user.id,
        action="document_deleted",
        entity_type="claim_document",
        entity_id=document_id,
        old_value={"filename": doc.filename, "claim_id": doc.claim_id},
    )

    return {"status": "success", "message": "Document deleted successfully."}
