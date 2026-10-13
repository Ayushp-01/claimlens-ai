import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Date,
    Numeric,
    Integer,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="patient", nullable=False)  # patient, investigator, admin
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    assigned_claims = relationship("Claim", back_populates="assigned_investigator", foreign_keys="Claim.assigned_investigator_id")
    uploaded_documents = relationship("ClaimDocument", back_populates="uploaded_by")
    notes = relationship("InvestigationNote", back_populates="author")
    document_requests = relationship("DocumentRequest", back_populates="requested_by")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor")


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    policy_number = Column(String(100), nullable=True)
    member_reference = Column(String(100), nullable=True)

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    policies = relationship("InsurancePolicy", back_populates="patient", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="patient")


class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False)
    policy_number = Column(String(100), nullable=False, index=True)
    member_reference = Column(String(100), nullable=True)
    policy_type = Column(String(50), default="individual", nullable=False)  # individual, family, group, corporate
    insurer_name = Column(String(255), nullable=False)
    coverage_start = Column(Date, nullable=False)
    coverage_end = Column(Date, nullable=False)
    max_coverage_amount = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    copay_percentage = Column(Numeric(5, 2), default=10.0, nullable=True)
    deductible_amount = Column(Numeric(12, 2), default=0.0, nullable=True)
    tpa_name = Column(String(255), nullable=True)

    # Relationships
    patient = relationship("PatientProfile", back_populates="policies")
    claims = relationship("Claim", back_populates="policy")


class Provider(Base):
    __tablename__ = "providers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    provider_code = Column(String(100), unique=True, index=True, nullable=False)
    specialty = Column(String(100), nullable=False)
    hospital_type = Column(String(100), nullable=False)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    npi_number = Column(String(100), nullable=True)
    is_flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    claims = relationship("Claim", back_populates="provider")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    claim_reference = Column(String(50), unique=True, index=True, nullable=False)  # CLM-YYYYMM-NNNN
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False)
    patient_name = Column(String(255), nullable=True)
    policy_id = Column(String(36), ForeignKey("insurance_policies.id"), nullable=False)
    provider_id = Column(String(36), ForeignKey("providers.id"), nullable=False)
    treatment_date = Column(Date, nullable=False)
    admission_date = Column(Date, nullable=True)
    discharge_date = Column(Date, nullable=True)
    treatment_description = Column(Text, nullable=False)
    invoice_number = Column(String(100), index=True, nullable=False)
    total_claimed_amount = Column(Numeric(12, 2), nullable=False)
    status = Column(
        String(50),
        default="submitted",
        nullable=False,
    )  # submitted, validation, risk_screening, under_review, documentation_requested, approved, partially_approved, rejected, payment_processing, settled
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    assigned_investigator_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    risk_score = Column(Numeric(5, 2), default=0.0, nullable=False)
    risk_priority = Column(String(20), default="low", nullable=False)  # low, medium, high, critical
    is_synthetic = Column(Boolean, default=False, nullable=False)
    approved_amount = Column(Numeric(12, 2), nullable=True)
    settled_amount = Column(Numeric(12, 2), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Relationships
    patient = relationship("PatientProfile", back_populates="claims")
    policy = relationship("InsurancePolicy", back_populates="claims")
    provider = relationship("Provider", back_populates="claims")
    assigned_investigator = relationship("User", back_populates="assigned_claims", foreign_keys=[assigned_investigator_id])
    line_items = relationship("ClaimLineItem", back_populates="claim", cascade="all, delete-orphan", order_by="ClaimLineItem.sequence_number")
    documents = relationship("ClaimDocument", back_populates="claim", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="claim", cascade="all, delete-orphan")
    risk_findings = relationship("RiskFinding", back_populates="claim", cascade="all, delete-orphan")
    notes = relationship("InvestigationNote", back_populates="claim", cascade="all, delete-orphan")
    document_requests = relationship("DocumentRequest", back_populates="claim", cascade="all, delete-orphan")
    status_history = relationship("ClaimStatusHistory", back_populates="claim", cascade="all, delete-orphan", order_by="ClaimStatusHistory.timestamp.desc()")
    notifications = relationship("Notification", back_populates="claim", cascade="all, delete-orphan")


class ClaimLineItem(Base):
    __tablename__ = "claim_line_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    service_description = Column(String(255), nullable=False)
    billing_code = Column(String(50), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_amount = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(10, 2), nullable=False)
    sequence_number = Column(Integer, default=1, nullable=False)

    # Relationships
    claim = relationship("Claim", back_populates="line_items")


class ClaimDocument(Base):
    __tablename__ = "claim_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    document_type = Column(
        String(50), nullable=False
    )  # hospital_invoice, medical_bill, discharge_summary, prescription, supporting_evidence, other
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    # Relationships
    claim = relationship("Claim", back_populates="documents")
    uploaded_by = relationship("User", back_populates="uploaded_documents")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    score = Column(Numeric(5, 2), nullable=False)  # 0 - 100
    priority = Column(String(20), nullable=False)  # low, medium, high, critical
    rule_version = Column(String(50), default="1.0.0", nullable=False)
    assessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    triggered_rule_count = Column(Integer, default=0, nullable=False)
    is_latest = Column(Boolean, default=True, nullable=False)

    # Relationships
    claim = relationship("Claim", back_populates="risk_assessments")
    findings = relationship("RiskFinding", back_populates="assessment", cascade="all, delete-orphan")


class RiskFinding(Base):
    __tablename__ = "risk_findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assessment_id = Column(String(36), ForeignKey("risk_assessments.id"), nullable=False)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    rule_id = Column(String(50), nullable=False)
    rule_name = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False)
    score_contribution = Column(Numeric(5, 2), nullable=False)
    evidence = Column(Text, nullable=True)  # JSON formatted string
    explanation = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    is_false_positive = Column(Boolean, default=False, nullable=False)
    false_positive_reason = Column(Text, nullable=True)
    false_positive_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    false_positive_at = Column(DateTime, nullable=True)

    # Relationships
    assessment = relationship("RiskAssessment", back_populates="findings")
    claim = relationship("Claim", back_populates="risk_findings")
    false_positive_by = relationship("User", foreign_keys=[false_positive_by_id])


class DuplicateMatch(Base):
    __tablename__ = "duplicate_matches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    claim_id_1 = Column(String(36), ForeignKey("claims.id"), nullable=False)
    claim_id_2 = Column(String(36), ForeignKey("claims.id"), nullable=False)
    match_type = Column(String(20), nullable=False)  # exact, near
    similarity_score = Column(Numeric(5, 2), nullable=False)
    matching_fields = Column(Text, nullable=True)  # JSON text
    differing_fields = Column(Text, nullable=True)  # JSON text
    confirmed_duplicate = Column(Boolean, default=False, nullable=False)
    confirmed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    claim_1 = relationship("Claim", foreign_keys=[claim_id_1])
    claim_2 = relationship("Claim", foreign_keys=[claim_id_2])
    confirmed_by = relationship("User", foreign_keys=[confirmed_by_id])


class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_private = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    claim = relationship("Claim", back_populates="notes")
    author = relationship("User", back_populates="notes")


class DocumentRequest(Base):
    __tablename__ = "document_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    requested_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    document_types = Column(Text, nullable=False)  # JSON array string e.g. ["hospital_invoice", "discharge_summary"]
    message = Column(Text, nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String(20), default="pending", nullable=False)  # pending, fulfilled, overdue
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    fulfilled_at = Column(DateTime, nullable=True)

    # Relationships
    claim = relationship("Claim", back_populates="document_requests")
    requested_by = relationship("User", back_populates="document_requests")


class ClaimStatusHistory(Base):
    __tablename__ = "claim_status_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    changed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    claim = relationship("Claim", back_populates="status_history")
    changed_by = relationship("User", foreign_keys=[changed_by_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="notifications")
    claim = relationship("Claim", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=False)
    old_value = Column(Text, nullable=True)  # JSON text
    new_value = Column(Text, nullable=True)  # JSON text
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    actor = relationship("User", back_populates="audit_logs")
