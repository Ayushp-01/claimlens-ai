import json
import math
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import (
    Claim,
    RiskAssessment,
    RiskFinding,
    ClaimLineItem,
    ClaimDocument,
    Provider,
    InsurancePolicy,
)
from app.services.duplicate_detector import detect_and_record_duplicates, check_exact_match, check_near_match


# Incompatible billing code pairs for Rule 5
INCOMPATIBLE_CODE_PAIRS = [
    ("SURG-101", "SURG-102"),
    ("MED-99213", "MED-99214"),
    ("ANES-01", "ANES-02"),
    ("ICU-001", "GEN-001"),
    ("CARD-201", "CARD-202"),
    ("RAD-301", "RAD-302"),
]

INVALID_CODE_PREFIXES = ("INV-", "ERR-", "INVALID", "TEST-")


class RiskEngine:
    RULE_VERSION = "1.0.0"

    def rule_1_exact_duplicate(self, db: Session, claim: Claim) -> Optional[Dict[str, Any]]:
        """Rule 1: Exact duplicate invoices (same invoice_number + same provider + same patient)."""
        other_claims = (
            db.query(Claim)
            .filter(
                Claim.id != claim.id,
                Claim.patient_id == claim.patient_id,
                Claim.provider_id == claim.provider_id,
                Claim.invoice_number == claim.invoice_number,
            )
            .all()
        )
        if other_claims:
            matched = other_claims[0]
            return {
                "rule_id": "R001",
                "rule_name": "Exact Duplicate Invoice",
                "severity": "critical",
                "score_contribution": 40.0,
                "evidence": {
                    "matched_claim_id": matched.id,
                    "matched_claim_reference": matched.claim_reference,
                    "invoice_number": claim.invoice_number,
                },
                "explanation": (
                    f"Invoice number '{claim.invoice_number}' was already submitted by the same patient for the same provider "
                    f"in claim {matched.claim_reference}."
                ),
                "recommended_action": "Freeze claim pending verification. Initiate duplicate billing review.",
            }
        return None

    def rule_2_near_duplicate(self, db: Session, claim: Claim) -> Optional[Dict[str, Any]]:
        """Rule 2: Near-duplicate claims (same patient + same provider + dates within 7 days + amounts within 10%)."""
        candidates = (
            db.query(Claim)
            .filter(
                Claim.id != claim.id,
                Claim.patient_id == claim.patient_id,
                Claim.provider_id == claim.provider_id,
            )
            .all()
        )
        for other in candidates:
            # Skip if exact duplicate already caught by Rule 1
            if check_exact_match(claim, other):
                continue
            is_near, similarity = check_near_match(claim, other)
            if is_near:
                days_diff = abs((claim.treatment_date - other.treatment_date).days)
                amt1 = float(claim.total_claimed_amount)
                amt2 = float(other.total_claimed_amount)
                pct_diff = round(abs(amt1 - amt2) / max(amt1, amt2) * 100, 2)
                return {
                    "rule_id": "R002",
                    "rule_name": "Near-Duplicate Claim Detected",
                    "severity": "high",
                    "score_contribution": 30.0,
                    "evidence": {
                        "matched_claim_id": other.id,
                        "matched_claim_reference": other.claim_reference,
                        "similarity_score": similarity,
                        "days_difference": days_diff,
                        "percentage_amount_difference": pct_diff,
                    },
                    "explanation": (
                        f"Potential near-duplicate detected with claim {other.claim_reference}: "
                        f"treatment dates are {days_diff} day(s) apart and total amount differs by only {pct_diff}%."
                    ),
                    "recommended_action": "Cross-reference medical bills and line items to prevent overlapping coverage reimbursement.",
                }
        return None

    def rule_3_itemized_mismatch(self, claim: Claim) -> Optional[Dict[str, Any]]:
        """Rule 3: Claim total vs itemized total mismatch (|total_claimed - sum(line_totals)| > 0.01)."""
        if not claim.line_items:
            return None
        sum_lines = sum(Decimal(str(item.line_total)) for item in claim.line_items)
        claimed = Decimal(str(claim.total_claimed_amount))
        diff = abs(claimed - sum_lines)
        if diff > Decimal("0.01"):
            return {
                "rule_id": "R003",
                "rule_name": "Itemized Total Mismatch",
                "severity": "medium",
                "score_contribution": 25.0,
                "evidence": {
                    "claimed_amount": str(claimed),
                    "sum_of_lines": str(sum_lines),
                    "discrepancy": str(diff),
                },
                "explanation": (
                    f"Claim total of INR {claimed} does not match the sum of itemized line items (INR {sum_lines}). "
                    f"Discrepancy of INR {diff}."
                ),
                "recommended_action": "Request corrected itemized breakdown and audit hospital billing calculation.",
            }
        return None

    def rule_4_repeated_line_items(self, claim: Claim) -> Optional[Dict[str, Any]]:
        """Rule 4: Repeated billing line items (same billing_code appears >2x in same claim)."""
        if not claim.line_items:
            return None
        counts: Dict[str, int] = {}
        for item in claim.line_items:
            code = item.billing_code.strip().upper()
            counts[code] = counts.get(code, 0) + 1

        repeated = {c: cnt for c, cnt in counts.items() if cnt > 2}
        if repeated:
            return {
                "rule_id": "R004",
                "rule_name": "Repeated Billing Line Items",
                "severity": "medium",
                "score_contribution": 15.0,
                "evidence": {"repeated_codes": repeated},
                "explanation": (
                    f"Billing code(s) {', '.join(f'{k} ({v}x)' for k, v in repeated.items())} "
                    f"appear more than 2 times in this single claim."
                ),
                "recommended_action": "Verify with provider whether repetitive line charges represent unbundled or duplicated services.",
            }
        return None

    def rule_5_coding_inconsistencies(self, claim: Claim) -> Optional[Dict[str, Any]]:
        """Rule 5: Medical coding inconsistencies (configured list of invalid code combos or invalid codes)."""
        if not claim.line_items:
            return None
        codes = [item.billing_code.strip().upper() for item in claim.line_items]

        # Check for invalid code prefixes
        invalid_codes = [c for c in codes if any(c.startswith(prefix) for prefix in INVALID_CODE_PREFIXES)]

        # Check for mutually exclusive combos
        conflicting_pairs = []
        for c1, c2 in INCOMPATIBLE_CODE_PAIRS:
            if c1 in codes and c2 in codes:
                conflicting_pairs.append((c1, c2))

        if invalid_codes or conflicting_pairs:
            evidence: Dict[str, Any] = {}
            explanations = []
            if invalid_codes:
                evidence["invalid_codes"] = invalid_codes
                explanations.append(f"Unrecognized/erroneous code formats detected: {', '.join(invalid_codes)}")
            if conflicting_pairs:
                evidence["conflicting_code_pairs"] = conflicting_pairs
                explanations.append(
                    f"Mutually exclusive code pairs billed together: {', '.join(f'{a} & {b}' for a, b in conflicting_pairs)}"
                )

            return {
                "rule_id": "R005",
                "rule_name": "Medical Coding Inconsistency",
                "severity": "high",
                "score_contribution": 20.0,
                "evidence": evidence,
                "explanation": ". ".join(explanations) + ".",
                "recommended_action": "Engage medical coding specialist to re-verify diagnostic and procedure classification codes.",
            }
        return None

    def rule_6_unusually_high_amount(self, db: Session, claim: Claim) -> Optional[Dict[str, Any]]:
        """
        Rule 6: Unusually high billing amount (compare to peer group of same provider specialty).
        If billed > 2.5 std devs above mean (min 5 sample claims) -> score +20.
        """
        provider = db.query(Provider).filter(Provider.id == claim.provider_id).first()
        if not provider:
            return None

        # Peer claims: same specialty
        peer_claims = (
            db.query(Claim)
            .join(Provider, Claim.provider_id == Provider.id)
            .filter(
                Provider.specialty == provider.specialty,
                Claim.id != claim.id,
            )
            .all()
        )

        if len(peer_claims) < 5:
            return None

        amounts = [float(c.total_claimed_amount) for c in peer_claims]
        mean_amt = sum(amounts) / len(amounts)
        variance = sum((x - mean_amt) ** 2 for x in amounts) / (len(amounts) - 1)
        std_dev = math.sqrt(variance)

        if std_dev == 0:
            return None

        current_amt = float(claim.total_claimed_amount)
        z_score = (current_amt - mean_amt) / std_dev

        if z_score > 2.5:
            threshold = mean_amt + 2.5 * std_dev
            return {
                "rule_id": "R006",
                "rule_name": "Unusually High Billing Amount",
                "severity": "high",
                "score_contribution": 20.0,
                "evidence": {
                    "specialty": provider.specialty,
                    "peer_sample_size": len(peer_claims),
                    "mean_amount": round(mean_amt, 2),
                    "std_dev": round(std_dev, 2),
                    "threshold_amount": round(threshold, 2),
                    "claimed_amount": round(current_amt, 2),
                    "z_score": round(z_score, 2),
                },
                "explanation": (
                    f"Claim amount of INR {current_amt:.2f} is {z_score:.2f} standard deviations above the specialty average "
                    f"(INR {mean_amt:.2f} for {provider.specialty}). Threshold is INR {threshold:.2f}."
                ),
                "recommended_action": "Audit line item charges against regional usual, customary, and reasonable (UCR) fee schedules.",
            }
        return None

    def rule_7_invalid_treatment_dates(self, claim: Claim, policy: Optional[InsurancePolicy]) -> Optional[Dict[str, Any]]:
        """
        Rule 7: Invalid treatment dates
        - discharge < admission
        - treatment_date > today + 1
        - service outside policy validity
        """
        today = date.today()
        tomorrow = today + timedelta(days=1)
        issues = []

        if claim.discharge_date and claim.admission_date and claim.discharge_date < claim.admission_date:
            issues.append(f"Discharge date ({claim.discharge_date}) precedes admission date ({claim.admission_date})")

        if claim.treatment_date and claim.treatment_date > tomorrow:
            issues.append(f"Treatment date ({claim.treatment_date}) is in the future")

        if policy:
            if claim.treatment_date < policy.coverage_start:
                issues.append(
                    f"Treatment date ({claim.treatment_date}) is prior to policy start date ({policy.coverage_start})"
                )
            if claim.treatment_date > policy.coverage_end:
                issues.append(
                    f"Treatment date ({claim.treatment_date}) is past policy expiration date ({policy.coverage_end})"
                )

        if issues:
            return {
                "rule_id": "R007",
                "rule_name": "Invalid Treatment Dates",
                "severity": "medium",
                "score_contribution": 15.0,
                "evidence": {
                    "treatment_date": str(claim.treatment_date),
                    "admission_date": str(claim.admission_date) if claim.admission_date else None,
                    "discharge_date": str(claim.discharge_date) if claim.discharge_date else None,
                    "policy_coverage_start": str(policy.coverage_start) if policy else None,
                    "policy_coverage_end": str(policy.coverage_end) if policy else None,
                    "issues": issues,
                },
                "explanation": "Date anomalies detected: " + "; ".join(issues) + ".",
                "recommended_action": "Contact patient and hospital to obtain authenticated discharge summary and admission register.",
            }
        return None

    def rule_8_unusual_frequency(self, db: Session, claim: Claim) -> Optional[Dict[str, Any]]:
        """Rule 8: Unusual claim frequency (same patient >3 claims in 30 days)."""
        window_start = claim.treatment_date - timedelta(days=30)
        window_end = claim.treatment_date + timedelta(days=30)

        count = (
            db.query(Claim)
            .filter(
                Claim.patient_id == claim.patient_id,
                Claim.treatment_date >= window_start,
                Claim.treatment_date <= window_end,
            )
            .count()
        )

        if count > 3:
            return {
                "rule_id": "R008",
                "rule_name": "Unusual Claim Frequency",
                "severity": "low",
                "score_contribution": 10.0,
                "evidence": {
                    "claims_in_30_days": count,
                    "window_start": str(window_start),
                    "window_end": str(window_end),
                },
                "explanation": (
                    f"Patient has submitted {count} claims within a 30-day window around this treatment date."
                ),
                "recommended_action": "Check patient diagnosis history for chronic care recurrence vs possible serial fraudulent claims.",
            }
        return None

    def rule_9_missing_required_documents(self, claim: Claim) -> Optional[Dict[str, Any]]:
        """
        Rule 9: Missing required documents
        - Claims over INR 50,000 should have 'hospital_invoice'
        - Hospital stays (admission_date is not None) should have 'discharge_summary'
        Score +15 per missing document.
        """
        doc_types = {d.document_type for d in claim.documents}
        missing = []

        if Decimal(str(claim.total_claimed_amount)) > Decimal("50000") and "hospital_invoice" not in doc_types:
            missing.append("hospital_invoice")

        if claim.admission_date is not None and "discharge_summary" not in doc_types:
            missing.append("discharge_summary")

        if missing:
            contrib = 15.0 * len(missing)
            return {
                "rule_id": "R009",
                "rule_name": "Missing Required Documents",
                "severity": "high" if len(missing) > 1 else "medium",
                "score_contribution": contrib,
                "evidence": {
                    "missing_documents": missing,
                    "uploaded_document_types": list(doc_types),
                },
                "explanation": (
                    f"Claim is missing mandatory documentation: {', '.join(d.replace('_', ' ').title() for d in missing)}."
                ),
                "recommended_action": "Issue automated documentation request to the patient.",
            }
        return None

    def rule_10_provider_anomalies(self, provider: Optional[Provider]) -> Optional[Dict[str, Any]]:
        """Rule 10: Provider billing anomalies (provider is_flagged in DB -> score +20)."""
        if provider and provider.is_flagged:
            return {
                "rule_id": "R010",
                "rule_name": "Provider Billing Anomaly",
                "severity": "high",
                "score_contribution": 20.0,
                "evidence": {
                    "provider_id": provider.id,
                    "provider_name": provider.name,
                    "flag_reason": provider.flag_reason,
                },
                "explanation": (
                    f"Provider '{provider.name}' is flagged in system watchlists. "
                    f"Reason: {provider.flag_reason or 'History of billing anomalies or compliance warnings'}."
                ),
                "recommended_action": "Flag claim for mandatory senior investigator review before any payment authorization.",
            }
        return None

    def screen_claim(self, db: Session, claim_id: str) -> RiskAssessment:
        """
        Run all 10 deterministic rules on claim, aggregate findings,
        calculate score capped at 100, determine priority band,
        persist RiskAssessment and RiskFinding records, and update claim.
        """
        claim = db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise ValueError(f"Claim with id {claim_id} not found")

        policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == claim.policy_id).first()
        provider = db.query(Provider).filter(Provider.id == claim.provider_id).first()

        # Detect and store duplicates in duplicate_matches table
        detect_and_record_duplicates(db, claim)

        raw_findings: List[Dict[str, Any]] = []

        # Rule 1
        r1 = self.rule_1_exact_duplicate(db, claim)
        if r1:
            raw_findings.append(r1)

        # Rule 2
        r2 = self.rule_2_near_duplicate(db, claim)
        if r2:
            raw_findings.append(r2)

        # Rule 3
        r3 = self.rule_3_itemized_mismatch(claim)
        if r3:
            raw_findings.append(r3)

        # Rule 4
        r4 = self.rule_4_repeated_line_items(claim)
        if r4:
            raw_findings.append(r4)

        # Rule 5
        r5 = self.rule_5_coding_inconsistencies(claim)
        if r5:
            raw_findings.append(r5)

        # Rule 6
        r6 = self.rule_6_unusually_high_amount(db, claim)
        if r6:
            raw_findings.append(r6)

        # Rule 7
        r7 = self.rule_7_invalid_treatment_dates(claim, policy)
        if r7:
            raw_findings.append(r7)

        # Rule 8
        r8 = self.rule_8_unusual_frequency(db, claim)
        if r8:
            raw_findings.append(r8)

        # Rule 9
        r9 = self.rule_9_missing_required_documents(claim)
        if r9:
            raw_findings.append(r9)

        # Rule 10
        r10 = self.rule_10_provider_anomalies(provider)
        if r10:
            raw_findings.append(r10)

        # Calculate score
        raw_score = sum(f["score_contribution"] for f in raw_findings)
        final_score = min(100.0, round(raw_score, 2))

        # Priority band: 0-24 Low, 25-49 Medium, 50-74 High, 75-100 Critical
        if final_score < 25.0:
            priority = "low"
        elif final_score < 50.0:
            priority = "medium"
        elif final_score < 75.0:
            priority = "high"
        else:
            priority = "critical"

        # Mark previous assessments for this claim as not latest
        db.query(RiskAssessment).filter(RiskAssessment.claim_id == claim.id).update({"is_latest": False})

        # Create new RiskAssessment
        assessment = RiskAssessment(
            claim_id=claim.id,
            score=Decimal(str(final_score)),
            priority=priority,
            rule_version=self.RULE_VERSION,
            triggered_rule_count=len(raw_findings),
            is_latest=True,
        )
        db.add(assessment)
        db.flush()

        # Create RiskFindings
        for f in raw_findings:
            evidence_json = json.dumps(f.get("evidence", {})) if f.get("evidence") is not None else None
            finding = RiskFinding(
                assessment_id=assessment.id,
                claim_id=claim.id,
                rule_id=f["rule_id"],
                rule_name=f["rule_name"],
                severity=f["severity"],
                score_contribution=Decimal(str(f["score_contribution"])),
                evidence=evidence_json,
                explanation=f["explanation"],
                recommended_action=f.get("recommended_action"),
                is_false_positive=False,
            )
            db.add(finding)

        # Update Claim's score and priority
        claim.risk_score = Decimal(str(final_score))
        claim.risk_priority = priority
        db.add(claim)

        db.commit()
        db.refresh(assessment)
        return assessment


risk_engine = RiskEngine()
