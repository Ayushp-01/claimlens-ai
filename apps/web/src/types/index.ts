export type UserRole = 'patient' | 'investigator' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  createdAt?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth: string;
  address?: string;
}

export type ClaimStatus =
  | 'submitted'
  | 'validation'
  | 'risk_screening'
  | 'under_review'
  | 'documentation_requested'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'payment_processing'
  | 'settled';

export type RiskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface LineItem {
  id: string;
  claimId?: string;
  serviceDescription: string;
  billingCode?: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
}

export interface Document {
  id: string;
  claimId: string;
  name: string;
  documentType: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  verified?: boolean;
}

export interface DocumentRequest {
  id: string;
  claimId: string;
  documentTypes: string[];
  message: string;
  requestedAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  fulfilledAt?: string;
}

export interface Note {
  id: string;
  claimId: string;
  authorId: string;
  authorName: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: RiskPriority;
  scoreContribution: number;
  explanation: string;
  evidence: Record<string, any>;
  isFalsePositive: boolean;
  falsePositiveReason?: string;
}

export interface RiskAssessment {
  id: string;
  claimId: string;
  riskScore: number;
  priority: RiskPriority;
  rulesTriggered: number;
  findings: Finding[];
  assessedAt: string;
}

export interface DuplicateMatch {
  id: string;
  claim1Id: string;
  claim2Id: string;
  claim1Reference: string;
  claim2Reference: string;
  patientName?: string;
  providerName?: string;
  treatmentDate?: string;
  amount?: number;
  matchType: 'exact' | 'near_duplicate';
  similarityScore: number;
  matchingFields: string[];
  differingFields: string[];
  status: 'suspected' | 'confirmed_duplicate' | 'cleared_false_positive';
  createdAt: string;
  details?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details?: string | Record<string, any>;
  diff?: {
    old: Record<string, any>;
    new: Record<string, any>;
  };
}

export interface Policy {
  id: string;
  patientId: string;
  policyNumber: string;
  memberReference: string;
  insurerName: string;
  policyType: string;
  validFrom: string;
  validTo: string;
  sumInsured: number;
  remainingSum: number;
  status: 'active' | 'expired' | 'suspended';
  copayPercentage?: number;
  deductibleAmount?: number;
  tpaName?: string;
}

export interface PolicyData {
  policyNumber: string;
  memberReference: string;
  insurerName: string;
  policyType: string;
  validFrom: string;
  validTo: string;
  sumInsured: number;
  copayPercentage?: number;
  deductibleAmount?: number;
  tpaName?: string;
}

export interface PatientProfile extends User {
  policies: Policy[];
}

export interface ClaimEvent {
  id: string;
  claimId: string;
  timestamp: string;
  status: ClaimStatus;
  title: string;
  description: string;
  actor?: string;
}

export interface Claim {
  id: string;
  referenceNumber: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  policyNumber: string;
  memberReference: string;
  policyType?: string;
  policyId?: string;
  copayPercentage?: number;
  deductibleAmount?: number;
  tpaName?: string;
  sumInsured?: number;
  providerName: string;
  treatmentDate: string;
  admissionDate?: string;
  dischargeDate?: string;
  treatmentDescription: string;
  billingCodes?: string[];
  invoiceNumber: string;
  claimedAmount: number;
  approvedAmount?: number;
  settledAmount?: number;
  rejectionReason?: string;
  status: ClaimStatus;
  riskScore?: number;
  riskLevel?: RiskPriority;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  lineItems: LineItem[];
  documents: Document[];
  documentRequests?: DocumentRequest[];
  notes?: Note[];
  timeline?: ClaimEvent[];
}

export interface ClaimDetail extends Claim {
  statusExplanations?: string;
}

export interface InvestigatorClaimDetail extends Claim {
  riskAssessment?: RiskAssessment;
  duplicateMatches?: DuplicateMatch[];
  investigatorNotes?: Note[];
  auditLogs?: AuditLog[];
}

export interface ClaimSubmitData {
  patientName?: string;
  patient_name?: string;
  policyId?: string;
  policyNumber: string;
  memberReference: string;
  providerName: string;
  treatmentDate: string;
  admissionDate?: string;
  dischargeDate?: string;
  treatmentDescription: string;
  billingCodes?: string[];
  invoiceNumber: string;
  claimedAmount: number;
  lineItems: {
    serviceDescription: string;
    billingCode?: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[];
  documentIds?: string[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClaimQueueParams extends PaginationParams {
  riskLevel?: string;
  assignedTo?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  queueType?: 'all' | 'flagged';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PatientDashboard {
  totalClaims: number;
  awaitingProcessing: number;
  underReview: number;
  approved: number;
  settled: number;
  rejected: number;
  totalClaimedAmount: number;
  totalApprovedAmount: number;
  totalSettledAmount: number;
  recentClaims: Claim[];
}

export interface ClaimQueueItem {
  id: string;
  referenceNumber: string;
  patientName: string;
  providerName: string;
  treatmentDate: string;
  claimedAmount: number;
  riskScore: number;
  riskLevel: RiskPriority;
  rulesTriggered: number;
  isDuplicate: boolean;
  assignedTo?: string;
  assignedToName?: string;
  daysWaiting: number;
  status: ClaimStatus;
  createdAt: string;
}

export interface InvestigatorDashboard {
  totalClaimsReceived: number;
  awaitingReview: number;
  highPriorityClaims: number;
  potentialDuplicates: number;
  billingInconsistencies: number;
  providerAnomalies: number;
  avgReviewTimeHours: number;
  investigationBacklog: number;
  amountUnderInvestigation: number;
  totalApprovedAmount: number;
  totalSettledAmount: number;
  duplicateExposure: number;
  recentHighPriorityClaims: ClaimQueueItem[];
}

export interface DocRequestData {
  documentTypes: string[];
  message: string;
}

export interface DecisionData {
  decision: 'approve' | 'partially_approve' | 'reject' | 'request_verification' | 'escalate';
  approvedAmount?: number;
  reason: string;
  notes?: string;
}

export interface AuditLogParams extends PaginationParams {
  actor?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  provider?: string;
  status?: string;
  riskLevel?: string;
}

export interface TimeSeriesData {
  date: string;
  claimsCount: number;
  flaggedCount: number;
  amount: number;
}

export interface StatusData {
  status: string;
  count: number;
  percentage: number;
  fill?: string;
}

export interface RiskData {
  range: string;
  count: number;
  level: RiskPriority;
  fill?: string;
}

export interface RuleData {
  ruleName: string;
  ruleId: string;
  count: number;
  severity: RiskPriority;
}

export interface ProviderData {
  providerName: string;
  totalClaims: number;
  flaggedClaims: number;
  flagRate: number;
  totalAmount: number;
}

export interface AmountData {
  month: string;
  claimed: number;
  approved: number;
  settled: number;
}

export interface DuplicateExposureData {
  providerName: string;
  duplicateCount: number;
  exposureAmount: number;
}

export interface DashboardCharts {
  timeSeries: TimeSeriesData[];
  statusDistribution: StatusData[];
  riskDistribution: RiskData[];
  topRules: RuleData[];
  providerSummary: ProviderData[];
  amountComparison: AmountData[];
  duplicateExposure: DuplicateExposureData[];
  turnaroundTime: { date: string; avgHours: number }[];
  summaryMetrics: {
    totalClaims: number;
    flagRate: number;
    duplicateRate: number;
    falsePositiveRate: number;
    approvalRate: number;
  };
}
