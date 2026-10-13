import pytest
from datetime import date, timedelta
from decimal import Decimal

from app.models import (
    Claim,
    ClaimLineItem,
    ClaimDocument,
    Provider,
    InsurancePolicy,
)
from app.services.risk_engine import risk_engine


def test_rule_1_exact_duplicate(db_session, test_patient, test_provider, test_policy):
    """Rule 1: Same invoice + same provider + same patient triggers R001 (+40)."""
    claim1 = Claim(
        claim_reference="CLM-2024-0001",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 5, 1),
        treatment_description="Initial visit",
        invoice_number="INV-EXACT-99",
        total_claimed_amount=Decimal("20000.00"),
        status="approved",
    )
    db_session.add(claim1)
    db_session.commit()

    claim2 = Claim(
        claim_reference="CLM-2024-0002",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 5, 1),
        treatment_description="Duplicate submission",
        invoice_number="INV-EXACT-99",
        total_claimed_amount=Decimal("20000.00"),
        status="submitted",
    )
    db_session.add(claim2)
    db_session.commit()

    finding = risk_engine.rule_1_exact_duplicate(db_session, claim2)
    assert finding is not None
    assert finding["rule_id"] == "R001"
    assert finding["score_contribution"] == 40.0


def test_rule_2_near_duplicate(db_session, test_patient, test_provider, test_policy):
    """Rule 2: Same patient + same provider + dates within 7 days + amounts within 10% triggers R002 (+30)."""
    claim1 = Claim(
        claim_reference="CLM-2024-0010",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 5, 10),
        treatment_description="First consultation",
        invoice_number="INV-A-100",
        total_claimed_amount=Decimal("10000.00"),
        status="approved",
    )
    db_session.add(claim1)
    db_session.commit()

    claim2 = Claim(
        claim_reference="CLM-2024-0011",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 5, 13),  # 3 days difference
        treatment_description="Second consultation",
        invoice_number="INV-B-101",
        total_claimed_amount=Decimal("10500.00"),  # 5% difference
        status="submitted",
    )
    db_session.add(claim2)
    db_session.commit()

    finding = risk_engine.rule_2_near_duplicate(db_session, claim2)
    assert finding is not None
    assert finding["rule_id"] == "R002"
    assert finding["score_contribution"] == 30.0


def test_rule_3_itemized_mismatch(db_session, test_patient, test_provider, test_policy):
    """Rule 3: |total_claimed - sum(line_totals)| > 0.01 triggers R003 (+25)."""
    claim = Claim(
        claim_reference="CLM-2024-0020",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 5, 20),
        treatment_description="Mismatch test",
        invoice_number="INV-MISMATCH",
        total_claimed_amount=Decimal("35000.00"),
        status="submitted",
    )
    db_session.add(claim)
    db_session.flush()

    # Lines total: 10000 + 20000 = 30000 != 35000
    db_session.add(ClaimLineItem(claim_id=claim.id, service_description="Item 1", billing_code="C1", quantity=1, unit_amount=Decimal("10000.00"), line_total=Decimal("10000.00"), sequence_number=1))
    db_session.add(ClaimLineItem(claim_id=claim.id, service_description="Item 2", billing_code="C2", quantity=1, unit_amount=Decimal("20000.00"), line_total=Decimal("20000.00"), sequence_number=2))
    db_session.commit()
    db_session.refresh(claim)

    finding = risk_engine.rule_3_itemized_mismatch(claim)
    assert finding is not None
    assert finding["rule_id"] == "R003"
    assert finding["score_contribution"] == 25.0


def test_rule_4_repeated_line_items(db_session, test_patient, test_provider, test_policy):
    """Rule 4: Same billing code appears >2 times in same claim triggers R004 (+15)."""
    claim = Claim(
        claim_reference="CLM-2024-0030",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 5, 25),
        treatment_description="Repeated code test",
        invoice_number="INV-REPEAT",
        total_claimed_amount=Decimal("15000.00"),
        status="submitted",
    )
    db_session.add(claim)
    db_session.flush()

    for i in range(3):  # 3 times
        db_session.add(ClaimLineItem(claim_id=claim.id, service_description=f"Repeat {i}", billing_code="REPEAT-CODE", quantity=1, unit_amount=Decimal("5000.00"), line_total=Decimal("5000.00"), sequence_number=i+1))
    db_session.commit()
    db_session.refresh(claim)

    finding = risk_engine.rule_4_repeated_line_items(claim)
    assert finding is not None
    assert finding["rule_id"] == "R004"
    assert finding["score_contribution"] == 15.0


def test_rule_5_coding_inconsistencies(db_session, test_patient, test_provider, test_policy):
    """Rule 5: Incompatible code pairs (SURG-101 and SURG-102) trigger R005 (+20)."""
    claim = Claim(
        claim_reference="CLM-2024-0040",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 6, 1),
        treatment_description="Incompatible coding test",
        invoice_number="INV-CODE-ERR",
        total_claimed_amount=Decimal("40000.00"),
        status="submitted",
    )
    db_session.add(claim)
    db_session.flush()

    db_session.add(ClaimLineItem(claim_id=claim.id, service_description="Proc 1", billing_code="SURG-101", quantity=1, unit_amount=Decimal("20000.00"), line_total=Decimal("20000.00"), sequence_number=1))
    db_session.add(ClaimLineItem(claim_id=claim.id, service_description="Proc 2", billing_code="SURG-102", quantity=1, unit_amount=Decimal("20000.00"), line_total=Decimal("20000.00"), sequence_number=2))
    db_session.commit()
    db_session.refresh(claim)

    finding = risk_engine.rule_5_coding_inconsistencies(claim)
    assert finding is not None
    assert finding["rule_id"] == "R005"
    assert finding["score_contribution"] == 20.0


def test_rule_6_unusually_high_amount(db_session, test_patient, test_provider, test_policy):
    """Rule 6: Amount > 2.5 std devs above peer group (min 5 samples) triggers R006 (+20)."""
    # Create 5 baseline peer claims of around ~10,000 INR
    for i in range(5):
        c = Claim(
            claim_reference=f"CLM-PEER-{i}",
            patient_id=test_patient.patient_profile.id,
            policy_id=test_policy.id,
            provider_id=test_provider.id,
            treatment_date=date(2024, 6, 1 + i),
            treatment_description=f"Peer claim {i}",
            invoice_number=f"INV-PEER-{i}",
            total_claimed_amount=Decimal(str(10000 + (i * 200))),
            status="approved",
        )
        db_session.add(c)
    db_session.commit()

    # Outlier claim: 250,000 INR
    outlier_claim = Claim(
        claim_reference="CLM-OUTLIER-01",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 6, 10),
        treatment_description="Outlier procedure",
        invoice_number="INV-OUTLIER",
        total_claimed_amount=Decimal("250000.00"),
        status="submitted",
    )
    db_session.add(outlier_claim)
    db_session.commit()

    finding = risk_engine.rule_6_unusually_high_amount(db_session, outlier_claim)
    assert finding is not None
    assert finding["rule_id"] == "R006"
    assert finding["score_contribution"] == 20.0


def test_rule_7_invalid_treatment_dates(db_session, test_patient, test_provider, test_policy):
    """Rule 7: discharge < admission triggers R007 (+15)."""
    claim = Claim(
        claim_reference="CLM-2024-0070",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 6, 15),
        admission_date=date(2024, 6, 15),
        discharge_date=date(2024, 6, 12),  # Discharge prior to admission
        treatment_description="Invalid dates test",
        invoice_number="INV-DATES-ERR",
        total_claimed_amount=Decimal("15000.00"),
        status="submitted",
    )
    db_session.add(claim)
    db_session.commit()

    finding = risk_engine.rule_7_invalid_treatment_dates(claim, test_policy)
    assert finding is not None
    assert finding["rule_id"] == "R007"
    assert finding["score_contribution"] == 15.0


def test_rule_8_unusual_frequency(db_session, test_patient, test_provider, test_policy):
    """Rule 8: >3 claims in 30 days triggers R008 (+10)."""
    base_t_date = date(2024, 7, 10)
    for i in range(4):
        c = Claim(
            claim_reference=f"CLM-FREQ-{i}",
            patient_id=test_patient.patient_profile.id,
            policy_id=test_policy.id,
            provider_id=test_provider.id,
            treatment_date=base_t_date + timedelta(days=i * 2),
            treatment_description=f"Frequent claim {i}",
            invoice_number=f"INV-FREQ-{i}",
            total_claimed_amount=Decimal("5000.00"),
            status="submitted",
        )
        db_session.add(c)
    db_session.commit()

    test_claim = c  # Last claim
    finding = risk_engine.rule_8_unusual_frequency(db_session, test_claim)
    assert finding is not None
    assert finding["rule_id"] == "R008"
    assert finding["score_contribution"] == 10.0


def test_rule_9_missing_required_documents(db_session, test_patient, test_provider, test_policy):
    """Rule 9: Claims over 50,000 without hospital_invoice trigger R009 (+15)."""
    claim = Claim(
        claim_reference="CLM-2024-0090",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 7, 20),
        treatment_description="High amount without invoice",
        invoice_number="INV-NO-DOC",
        total_claimed_amount=Decimal("65000.00"),  # > 50k
        status="submitted",
    )
    db_session.add(claim)
    db_session.commit()
    db_session.refresh(claim)

    finding = risk_engine.rule_9_missing_required_documents(claim)
    assert finding is not None
    assert finding["rule_id"] == "R009"
    assert finding["score_contribution"] == 15.0


def test_rule_10_provider_anomalies(db_session):
    """Rule 10: Provider is_flagged in DB triggers R010 (+20)."""
    flagged_provider = Provider(
        name="Flagged Test Hospital",
        provider_code="PRV-FLAG-99",
        specialty="General Medicine",
        hospital_type="Clinic",
        is_flagged=True,
        flag_reason="Compliance warning on duplicate lab panels",
    )
    db_session.add(flagged_provider)
    db_session.commit()

    finding = risk_engine.rule_10_provider_anomalies(flagged_provider)
    assert finding is not None
    assert finding["rule_id"] == "R010"
    assert finding["score_contribution"] == 20.0


def test_full_screen_claim_lifecycle(db_session, test_patient, test_provider, test_policy):
    """Test full screen_claim execution, priority banding, score capping, and record persistence."""
    claim = Claim(
        claim_reference="CLM-SCREEN-01",
        patient_id=test_patient.patient_profile.id,
        policy_id=test_policy.id,
        provider_id=test_provider.id,
        treatment_date=date(2024, 7, 25),
        admission_date=date(2024, 7, 25),
        discharge_date=date(2024, 7, 20),  # Rule 7 violation (+15)
        treatment_description="Full screening test",
        invoice_number="INV-FULL-SCREEN",
        total_claimed_amount=Decimal("80000.00"),  # Rule 9 violation (+15 for missing invoice, +15 for missing discharge summary = +30)
        status="submitted",
    )
    db_session.add(claim)
    db_session.commit()

    assessment = risk_engine.screen_claim(db_session, claim.id)
    assert assessment.id is not None
    assert assessment.claim_id == claim.id
    assert assessment.score > 0
    assert assessment.priority in ["low", "medium", "high", "critical"]
    assert assessment.is_latest is True
    assert len(assessment.findings) >= 2

    # Check that claim itself was updated with the score and priority
    db_session.refresh(claim)
    assert claim.risk_score == assessment.score
    assert claim.risk_priority == assessment.priority
