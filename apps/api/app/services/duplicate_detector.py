import json
from decimal import Decimal
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models import Claim, DuplicateMatch


def compute_field_similarities(claim1: Claim, claim2: Claim) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Compare fields between two claims and return matching and differing dictionaries."""
    matching: Dict[str, Any] = {}
    differing: Dict[str, Any] = {}

    # Patient
    if claim1.patient_id == claim2.patient_id:
        matching["patient_id"] = claim1.patient_id
    else:
        differing["patient_id"] = {"claim_1": claim1.patient_id, "claim_2": claim2.patient_id}

    # Provider
    if claim1.provider_id == claim2.provider_id:
        matching["provider_id"] = claim1.provider_id
    else:
        differing["provider_id"] = {"claim_1": claim1.provider_id, "claim_2": claim2.provider_id}

    # Invoice Number
    if claim1.invoice_number.strip().lower() == claim2.invoice_number.strip().lower():
        matching["invoice_number"] = claim1.invoice_number
    else:
        differing["invoice_number"] = {"claim_1": claim1.invoice_number, "claim_2": claim2.invoice_number}

    # Treatment Date
    date_diff = abs((claim1.treatment_date - claim2.treatment_date).days)
    if date_diff == 0:
        matching["treatment_date"] = str(claim1.treatment_date)
    else:
        differing["treatment_date"] = {
            "claim_1": str(claim1.treatment_date),
            "claim_2": str(claim2.treatment_date),
            "day_difference": date_diff,
        }

    # Total Amount
    amt1 = float(claim1.total_claimed_amount)
    amt2 = float(claim2.total_claimed_amount)
    amt_diff = abs(amt1 - amt2)
    max_amt = max(amt1, amt2) if max(amt1, amt2) > 0 else 1.0
    pct_diff = amt_diff / max_amt

    if amt_diff < 0.01:
        matching["total_claimed_amount"] = str(claim1.total_claimed_amount)
    else:
        differing["total_claimed_amount"] = {
            "claim_1": str(claim1.total_claimed_amount),
            "claim_2": str(claim2.total_claimed_amount),
            "difference": round(amt_diff, 2),
            "percentage_diff": round(pct_diff * 100, 2),
        }

    # Description
    if (claim1.treatment_description or "").strip().lower() == (claim2.treatment_description or "").strip().lower():
        matching["treatment_description"] = claim1.treatment_description
    else:
        differing["treatment_description"] = {
            "claim_1": claim1.treatment_description,
            "claim_2": claim2.treatment_description,
        }

    return matching, differing


def check_exact_match(claim1: Claim, claim2: Claim) -> bool:
    """Exact duplicate: same invoice_number + same provider_id + same patient_id."""
    return (
        claim1.invoice_number.strip().lower() == claim2.invoice_number.strip().lower()
        and claim1.provider_id == claim2.provider_id
        and claim1.patient_id == claim2.patient_id
    )


def check_near_match(claim1: Claim, claim2: Claim) -> Tuple[bool, float]:
    """Near-duplicate: same patient + same provider + dates within 7 days + amounts within 10%."""
    if claim1.patient_id != claim2.patient_id or claim1.provider_id != claim2.provider_id:
        return False, 0.0

    days_diff = abs((claim1.treatment_date - claim2.treatment_date).days)
    if days_diff > 7:
        return False, 0.0

    amt1 = float(claim1.total_claimed_amount)
    amt2 = float(claim2.total_claimed_amount)
    max_amt = max(amt1, amt2) if max(amt1, amt2) > 0 else 1.0
    amt_pct_diff = abs(amt1 - amt2) / max_amt

    if amt_pct_diff <= 0.10:
        # High similarity score (80% - 99%)
        score = 100.0 - (amt_pct_diff * 100.0 * 0.5) - (days_diff * 2.0)
        return True, max(75.0, min(99.0, round(score, 2)))

    return False, 0.0


def detect_and_record_duplicates(db: Session, claim: Claim) -> List[DuplicateMatch]:
    """
    Search existing claims for duplicates of the given claim,
    create or update DuplicateMatch records in the database, and return them.
    """
    # Fetch candidate claims with same patient
    candidates = (
        db.query(Claim)
        .filter(Claim.id != claim.id, Claim.patient_id == claim.patient_id)
        .all()
    )

    matches: List[DuplicateMatch] = []

    for other in candidates:
        is_exact = check_exact_match(claim, other)
        is_near, near_score = check_near_match(claim, other)

        if not (is_exact or is_near):
            continue

        match_type = "exact" if is_exact else "near"
        similarity = 100.0 if is_exact else near_score
        matching_fields, differing_fields = compute_field_similarities(claim, other)

        # Check if record already exists for this pair
        existing = (
            db.query(DuplicateMatch)
            .filter(
                (
                    (DuplicateMatch.claim_id_1 == claim.id)
                    & (DuplicateMatch.claim_id_2 == other.id)
                )
                | (
                    (DuplicateMatch.claim_id_1 == other.id)
                    & (DuplicateMatch.claim_id_2 == claim.id)
                )
            )
            .first()
        )

        if existing:
            existing.match_type = match_type
            existing.similarity_score = Decimal(str(similarity))
            existing.matching_fields = json.dumps(matching_fields)
            existing.differing_fields = json.dumps(differing_fields)
            db.add(existing)
            matches.append(existing)
        else:
            new_match = DuplicateMatch(
                claim_id_1=claim.id,
                claim_id_2=other.id,
                match_type=match_type,
                similarity_score=Decimal(str(similarity)),
                matching_fields=json.dumps(matching_fields),
                differing_fields=json.dumps(differing_fields),
                confirmed_duplicate=False,
            )
            db.add(new_match)
            matches.append(new_match)

    db.commit()
    return matches
