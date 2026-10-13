import pytest
from datetime import date
from decimal import Decimal
from fastapi import status


def test_submit_claim(client, test_patient, test_provider, test_policy, patient_token):
    """Test claim submission by patient, itemization, reference generation, and risk screening."""
    payload = {
        "policy_id": test_policy.id,
        "provider_id": test_provider.id,
        "treatment_date": str(date(2024, 6, 15)),
        "admission_date": None,
        "discharge_date": None,
        "treatment_description": "Cardiology diagnostic consult and ECG testing",
        "invoice_number": "INV-TEST-SUBMIT-01",
        "total_claimed_amount": 15000.00,
        "line_items": [
            {
                "service_description": "Consultation",
                "billing_code": "CARD-101",
                "quantity": 1,
                "unit_amount": 5000.00,
                "line_total": 5000.00,
                "sequence_number": 1,
            },
            {
                "service_description": "ECG diagnostic testing",
                "billing_code": "CARD-102",
                "quantity": 1,
                "unit_amount": 10000.00,
                "line_total": 10000.00,
                "sequence_number": 2,
            },
        ],
    }

    response = client.post(
        "/api/claims",
        json=payload,
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["claim_reference"].startswith("CLM-")
    assert float(data["total_claimed_amount"]) == 15000.00
    assert len(data["line_items"]) == 2
    assert "risk_score" in data
    assert "risk_priority" in data


def test_get_claim_own_vs_other_patient(
    client, test_patient, test_patient_2, test_provider, test_policy, patient_token, patient_2_token, investigator_token
):
    """Ensure patient isolation: patient cannot access another patient's claim, investigator can access all."""
    # Patient 1 submits claim
    payload = {
        "policy_id": test_policy.id,
        "provider_id": test_provider.id,
        "treatment_date": str(date(2024, 7, 10)),
        "treatment_description": "Private diagnostic consultation",
        "invoice_number": "INV-ISOLATION-01",
        "total_claimed_amount": 12000.00,
        "line_items": [],
    }
    create_resp = client.post(
        "/api/claims",
        json=payload,
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert create_resp.status_code == status.HTTP_201_CREATED
    claim_id = create_resp.json()["id"]

    # 1. Patient 1 accesses own claim -> 200 OK
    p1_resp = client.get(
        f"/api/claims/{claim_id}",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert p1_resp.status_code == status.HTTP_200_OK

    # 2. Patient 2 accesses Patient 1's claim -> 403 Forbidden
    p2_resp = client.get(
        f"/api/claims/{claim_id}",
        headers={"Authorization": f"Bearer {patient_2_token}"},
    )
    assert p2_resp.status_code == status.HTTP_403_FORBIDDEN

    # 3. Investigator accesses Patient 1's claim -> 200 OK
    inv_resp = client.get(
        f"/api/claims/{claim_id}",
        headers={"Authorization": f"Bearer {investigator_token}"},
    )
    assert inv_resp.status_code == status.HTTP_200_OK


def test_status_transitions(
    client, test_patient, test_provider, test_policy, patient_token, investigator_token
):
    """Test allowed state transitions and prohibition of illegal transitions."""
    # Create claim
    payload = {
        "policy_id": test_policy.id,
        "provider_id": test_provider.id,
        "treatment_date": str(date(2024, 7, 12)),
        "treatment_description": "General consultation",
        "invoice_number": "INV-TRANS-01",
        "total_claimed_amount": 60000.00,
        "line_items": [],
    }
    create_resp = client.post(
        "/api/claims",
        json=payload,
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    claim_data = create_resp.json()
    claim_id = claim_data["id"]
    assert claim_data["status"] == "under_review"

    # Valid: under_review -> approved
    resp_approve = client.put(
        f"/api/claims/{claim_id}/status",
        json={"status": "approved", "reason": "Audit verified clean"},
        headers={"Authorization": f"Bearer {investigator_token}"},
    )
    assert resp_approve.status_code == status.HTTP_200_OK
    assert resp_approve.json()["status"] == "approved"

    # Valid: approved -> payment_processing
    resp_pay = client.put(
        f"/api/claims/{claim_id}/status",
        json={"status": "payment_processing", "reason": "Dispatching payment"},
        headers={"Authorization": f"Bearer {investigator_token}"},
    )
    assert resp_pay.status_code == status.HTTP_200_OK

    # Valid: payment_processing -> settled
    resp_settle = client.put(
        f"/api/claims/{claim_id}/status",
        json={"status": "settled", "reason": "Payment disbursed"},
        headers={"Authorization": f"Bearer {investigator_token}"},
    )
    assert resp_settle.status_code == status.HTTP_200_OK

    # Invalid: settled -> submitted (terminal state transition should fail with 400)
    resp_invalid = client.put(
        f"/api/claims/{claim_id}/status",
        json={"status": "submitted", "reason": "Attempting invalid reset"},
        headers={"Authorization": f"Bearer {investigator_token}"},
    )
    assert resp_invalid.status_code == status.HTTP_400_BAD_REQUEST


def test_claims_pagination(
    client, test_patient, test_provider, test_policy, patient_token, investigator_token
):
    """Test pagination parameters and response formatting."""
    # Submit 3 claims
    for i in range(3):
        client.post(
            "/api/claims",
            json={
                "policy_id": test_policy.id,
                "provider_id": test_provider.id,
                "treatment_date": str(date(2024, 7, 1 + i)),
                "treatment_description": f"Checkup {i}",
                "invoice_number": f"INV-PAG-{i}",
                "total_claimed_amount": 5000.00 + (i * 100),
                "line_items": [],
            },
            headers={"Authorization": f"Bearer {patient_token}"},
        )

    # Retrieve patient claims page 1 with page_size=2
    resp = client.get(
        "/api/patient/claims?page=1&page_size=2",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total"] >= 3
    assert len(data["items"]) == 2
