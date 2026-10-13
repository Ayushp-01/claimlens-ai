import json
from datetime import date, datetime
from decimal import Decimal
from typing import Generic, List, Optional, TypeVar, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


T = TypeVar("T")


# ---------------------------------------------------------
# Generic Pagination
# ---------------------------------------------------------
class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------
# User & Auth
# ---------------------------------------------------------
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: str = "patient"


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None


# ---------------------------------------------------------
# Patient Profile
# ---------------------------------------------------------
class PatientProfileBase(BaseModel):
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    policy_number: Optional[str] = None
    member_reference: Optional[str] = None


class PatientProfileCreate(PatientProfileBase):
    pass


class PatientProfileUpdate(PatientProfileBase):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None


class PatientProfileResponse(PatientProfileBase):
    id: str
    user_id: str
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Insurance Policy
# ---------------------------------------------------------
class PolicyBase(BaseModel):
    policy_number: str
    member_reference: Optional[str] = None
    policy_type: str = "individual"  # individual, family, group, corporate
    insurer_name: str
    coverage_start: date
    coverage_end: date
    max_coverage_amount: Decimal
    is_active: bool = True
    copay_percentage: Optional[Decimal] = Decimal("10.00")
    deductible_amount: Optional[Decimal] = Decimal("0.00")
    tpa_name: Optional[str] = "Medi Assist Insurance TPA"


class PolicyCreate(PolicyBase):
    patient_id: Optional[str] = None


class PolicyResponse(PolicyBase):
    id: str
    patient_id: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Provider
# ---------------------------------------------------------
class ProviderBase(BaseModel):
    name: str
    provider_code: str
    specialty: str
    hospital_type: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    npi_number: Optional[str] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None


class ProviderCreate(ProviderBase):
    pass


class ProviderResponse(ProviderBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Claim Line Items
# ---------------------------------------------------------
class ClaimLineItemBase(BaseModel):
    service_description: str
    billing_code: Optional[str] = "CPT-99214"
    quantity: int = 1
    unit_amount: Decimal
    line_total: Decimal
    sequence_number: int = 1


class ClaimLineItemCreate(BaseModel):
    service_description: Optional[str] = None
    serviceDescription: Optional[str] = None
    billing_code: Optional[str] = None
    billingCode: Optional[str] = None
    quantity: Optional[int] = 1
    unit_amount: Optional[Decimal] = None
    unitAmount: Optional[Decimal] = None
    line_total: Optional[Decimal] = None
    totalAmount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    sequence_number: Optional[int] = 1

    @model_validator(mode="before")
    @classmethod
    def normalize_line_item(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("service_description") and data.get("serviceDescription"):
                data["service_description"] = data["serviceDescription"]
            if not data.get("billing_code") and data.get("billingCode"):
                data["billing_code"] = data["billingCode"]
            if not data.get("billing_code"):
                data["billing_code"] = "CPT-99214"
            if data.get("unit_amount") is None and data.get("unitAmount") is not None:
                data["unit_amount"] = data["unitAmount"]
            if data.get("line_total") is None:
                if data.get("totalAmount") is not None:
                    data["line_total"] = data["totalAmount"]
                elif data.get("total_amount") is not None:
                    data["line_total"] = data["total_amount"]
                elif data.get("unit_amount") is not None:
                    qty = Decimal(str(data.get("quantity") or 1))
                    u = Decimal(str(data["unit_amount"]))
                    data["line_total"] = qty * u
                else:
                    data["line_total"] = Decimal("1000.00")
            if data.get("unit_amount") is None:
                data["unit_amount"] = data.get("line_total", Decimal("1000.00"))
            if not data.get("service_description"):
                data["service_description"] = "Consultation & Clinical Evaluation"
        return data


class ClaimLineItemResponse(ClaimLineItemBase):
    id: str
    claim_id: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Claim Documents
# ---------------------------------------------------------
class ClaimDocumentResponse(BaseModel):
    id: str
    claim_id: str
    document_type: str
    filename: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_at: datetime
    uploaded_by_id: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Risk Findings & Assessment
# ---------------------------------------------------------
class RiskFindingResponse(BaseModel):
    id: str
    assessment_id: str
    claim_id: str
    rule_id: str
    rule_name: str
    severity: str
    score_contribution: Decimal
    evidence: Optional[Any] = None
    explanation: str
    recommended_action: Optional[str] = None
    is_false_positive: bool
    false_positive_reason: Optional[str] = None
    false_positive_by_id: Optional[str] = None
    false_positive_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("evidence", mode="before")
    @classmethod
    def parse_evidence(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v


class RiskAssessmentResponse(BaseModel):
    id: str
    claim_id: str
    score: Decimal
    priority: str
    rule_version: str
    assessed_at: datetime
    triggered_rule_count: int
    is_latest: bool
    findings: List[RiskFindingResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Duplicate Match
# ---------------------------------------------------------
class DuplicateMatchResponse(BaseModel):
    id: str
    claim_id_1: str
    claim_id_2: str
    match_type: str
    similarity_score: Decimal
    matching_fields: Optional[Any] = None
    differing_fields: Optional[Any] = None
    confirmed_duplicate: bool
    confirmed_by_id: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    notes: Optional[str] = None
    other_claim_reference: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("matching_fields", "differing_fields", mode="before")
    @classmethod
    def parse_json_fields(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v


# ---------------------------------------------------------
# Investigation Notes & Document Requests
# ---------------------------------------------------------
class InvestigationNoteCreate(BaseModel):
    content: str
    is_private: bool = True


class InvestigationNoteResponse(BaseModel):
    id: str
    claim_id: str
    author_id: str
    author_name: Optional[str] = None
    content: str
    is_private: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentRequestCreate(BaseModel):
    document_types: List[str]
    message: str
    due_date: Optional[date] = None


class DocumentRequestResponse(BaseModel):
    id: str
    claim_id: str
    requested_by_id: str
    requested_by_name: Optional[str] = None
    document_types: List[str]
    message: str
    due_date: Optional[date] = None
    status: str
    created_at: datetime
    fulfilled_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("document_types", mode="before")
    @classmethod
    def parse_document_types(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                return [str(parsed)]
            except Exception:
                return [v]
        return v


class DocumentRequestFulfill(BaseModel):
    document_ids: Optional[List[str]] = []
    message: Optional[str] = None


# ---------------------------------------------------------
# Claim Status & History
# ---------------------------------------------------------
class ClaimStatusHistoryResponse(BaseModel):
    id: str
    claim_id: str
    from_status: Optional[str] = None
    to_status: str
    changed_by_id: Optional[str] = None
    changed_by_name: Optional[str] = None
    reason: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class ClaimDecisionRequest(BaseModel):
    decision: str  # approved, partially_approved, rejected, documentation_requested, payment_processing
    reason: Optional[str] = None
    approved_amount: Optional[Decimal] = None
    approvedAmount: Optional[Decimal] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_decision(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("approved_amount") is None and data.get("approvedAmount") is not None:
                data["approved_amount"] = data["approvedAmount"]
            if not data.get("reason") and data.get("notes"):
                data["reason"] = data["notes"]
            if not data.get("reason"):
                data["reason"] = "Clinical review completed"
        return data


class ClaimStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None


class ClaimAssignRequest(BaseModel):
    investigator_id: Optional[str] = None


class FalsePositiveRequest(BaseModel):
    reason: str


# ---------------------------------------------------------
# Claims Main Schemas
# ---------------------------------------------------------
class ClaimSubmit(BaseModel):
    policy_id: Optional[str] = None
    policyId: Optional[str] = None
    policy_number: Optional[str] = None
    policyNumber: Optional[str] = None
    provider_id: Optional[str] = None
    providerId: Optional[str] = None
    provider_name: Optional[str] = None
    providerName: Optional[str] = None
    treatment_date: Optional[date] = None
    treatmentDate: Optional[date] = None
    admission_date: Optional[date] = None
    admissionDate: Optional[date] = None
    discharge_date: Optional[date] = None
    dischargeDate: Optional[date] = None
    treatment_description: Optional[str] = None
    treatmentDescription: Optional[str] = None
    invoice_number: Optional[str] = None
    invoiceNumber: Optional[str] = None
    total_claimed_amount: Optional[Decimal] = None
    claimedAmount: Optional[Decimal] = None
    billing_codes: Optional[List[str]] = None
    billingCodes: Optional[List[str]] = None
    line_items: Optional[List[ClaimLineItemCreate]] = []
    lineItems: Optional[List[Any]] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_claim_submit(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("policy_id") and data.get("policyId"):
                data["policy_id"] = data["policyId"]
            if not data.get("policy_number") and data.get("policyNumber"):
                data["policy_number"] = data["policyNumber"]
            if not data.get("provider_id") and data.get("providerId"):
                data["provider_id"] = data["providerId"]
            if not data.get("provider_name") and data.get("providerName"):
                data["provider_name"] = data["providerName"]
            if not data.get("treatment_date") and data.get("treatmentDate"):
                data["treatment_date"] = data["treatmentDate"]
            if not data.get("admission_date") and data.get("admissionDate"):
                data["admission_date"] = data["admissionDate"]
            if not data.get("discharge_date") and data.get("dischargeDate"):
                data["discharge_date"] = data["dischargeDate"]
            if not data.get("treatment_description") and data.get("treatmentDescription"):
                data["treatment_description"] = data["treatmentDescription"]
            if not data.get("invoice_number") and data.get("invoiceNumber"):
                data["invoice_number"] = data["invoiceNumber"]
            if data.get("total_claimed_amount") is None and data.get("claimedAmount") is not None:
                data["total_claimed_amount"] = data["claimedAmount"]
            if not data.get("line_items") and data.get("lineItems"):
                data["line_items"] = data["lineItems"]
        return data


class ClaimResponse(BaseModel):
    id: str
    claim_reference: str
    patient_id: str
    policy_id: str
    provider_id: str
    treatment_date: date
    admission_date: Optional[date] = None
    discharge_date: Optional[date] = None
    treatment_description: str
    invoice_number: str
    total_claimed_amount: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
    assigned_investigator_id: Optional[str] = None
    risk_score: Decimal
    risk_priority: str
    is_synthetic: bool
    approved_amount: Optional[Decimal] = None
    settled_amount: Optional[Decimal] = None
    rejection_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ClaimListItem(BaseModel):
    id: str
    claim_reference: str
    patient_id: str
    patient_name: Optional[str] = None
    policy_id: str
    policy_number: Optional[str] = None
    provider_id: str
    provider_name: Optional[str] = None
    provider_specialty: Optional[str] = None
    treatment_date: date
    admission_date: Optional[date] = None
    discharge_date: Optional[date] = None
    treatment_description: str
    invoice_number: str
    total_claimed_amount: Decimal
    status: str
    risk_score: Decimal
    risk_priority: str
    created_at: datetime
    assigned_investigator_name: Optional[str] = None
    document_count: Optional[int] = 0
    line_item_count: Optional[int] = 0
    approved_amount: Optional[Decimal] = None
    settled_amount: Optional[Decimal] = None
    rejection_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ClaimDetail(ClaimResponse):
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    policy: Optional[PolicyResponse] = None
    provider: Optional[ProviderResponse] = None
    assigned_investigator_name: Optional[str] = None
    line_items: List[ClaimLineItemResponse] = []
    documents: List[ClaimDocumentResponse] = []
    status_history: List[ClaimStatusHistoryResponse] = []
    document_requests: List[DocumentRequestResponse] = []
    status_explanations: Optional[str] = None
    # Investigator-only enriched fields
    notes: Optional[List[InvestigationNoteResponse]] = None
    risk_assessment: Optional[RiskAssessmentResponse] = None
    duplicate_matches: Optional[List[DuplicateMatchResponse]] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Notifications & Audit
# ---------------------------------------------------------
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    claim_id: Optional[str] = None
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("old_value", "new_value", mode="before")
    @classmethod
    def parse_audit_values(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v


# ---------------------------------------------------------
# Analytics Schemas
# ---------------------------------------------------------
class InvestigatorDashboardKPIs(BaseModel):
    total_claims: int
    pending_review: int
    high_critical_risk: int
    detected_duplicates: int
    total_exposure_amount: Decimal
    flagged_amount: Decimal
    approved_amount: Decimal
    settled_amount: Optional[Decimal] = None
    rejected_amount: Decimal
    avg_review_time_hours: float
    auto_flagged_rate: float


class PatientDashboardStats(BaseModel):
    total_claims: int
    active_claims: int
    approved_claims: int
    rejected_claims: int
    settled_claims: int
    total_claimed_amount: Decimal
    total_settled_amount: Decimal
    recent_claims: List[ClaimListItem]


class ClaimsOverTimeItem(BaseModel):
    date: str
    count: int
    total_amount: Decimal


class ClaimsByStatusItem(BaseModel):
    status: str
    count: int
    total_amount: Decimal


class RiskDistributionItem(BaseModel):
    priority: str
    count: int
    total_amount: Decimal


class FindingsByRuleItem(BaseModel):
    rule_id: str
    rule_name: str
    trigger_count: int
    total_risk_points: Decimal


class ClaimsByProviderItem(BaseModel):
    provider_id: str
    provider_name: str
    specialty: str
    is_flagged: bool
    claim_count: int
    high_risk_count: int
    total_amount: Decimal


class AmountsSummary(BaseModel):
    total_claimed: Decimal
    total_approved: Decimal
    total_rejected: Decimal
    total_in_review: Decimal
    total_settled: Decimal


class DuplicateExposure(BaseModel):
    exact_duplicate_count: int
    near_duplicate_count: int
    potential_savings: Decimal
    confirmed_fraud_count: int


class MonthlyOutcomesItem(BaseModel):
    month: str
    approved: int
    partially_approved: int
    rejected: int
    approved_amount: Decimal
    rejected_amount: Decimal


class ReviewTimeSummary(BaseModel):
    avg_hours_to_first_review: float
    avg_hours_to_decision: float
    median_hours_to_decision: float
