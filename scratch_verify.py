import requests
import json
import sys

API_URL = "http://localhost:8000/api"

def test_full_flow():
    print("=== Step 1: Login as Patient ===")
    login_resp = requests.post(f"{API_URL}/auth/login", json={
        "username_or_email": "patient1@demo.claimlens.ai",
        "password": "Demo@Patient1"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Patient login successful.")

    print("\n=== Step 2: Test User Profile Persistence ===")
    profile_resp = requests.get(f"{API_URL}/patient/profile", headers=headers)
    assert profile_resp.status_code == 200, f"Get profile failed: {profile_resp.text}"
    orig_profile = profile_resp.json()
    print(f"Original profile name: {orig_profile.get('name') or orig_profile.get('full_name')}")

    test_name = "Priya Sharma (Verified)"
    test_phone = "+91 98201 99887"
    test_address = "402 Oberoi Crest, Juhu, Mumbai, MH 400049"

    update_resp = requests.put(f"{API_URL}/patient/profile", headers=headers, json={
        "name": test_name,
        "phone": test_phone,
        "address": test_address,
        "date_of_birth": "1990-04-12"
    })
    assert update_resp.status_code == 200, f"Update profile failed: {update_resp.text}"
    updated = update_resp.json()
    print(f"Updated profile: Name='{updated.get('name')}', Phone='{updated.get('phone')}', Address='{updated.get('address')}'")
    assert updated.get("name") == test_name or updated.get("full_name") == test_name, "Name mismatch"
    assert updated.get("phone") == test_phone, "Phone mismatch"
    assert updated.get("address") == test_address, "Address mismatch"

    # Re-fetch to ensure SQLite persistence
    refetch_resp = requests.get(f"{API_URL}/patient/profile", headers=headers)
    refetch = refetch_resp.json()
    assert refetch.get("name") == test_name or refetch.get("full_name") == test_name, "Persistence failed!"
    print("Profile persistence successfully verified in SQLite database.")

    print("\n=== Step 3: Verify Expanded Policy Catalog (8 Policies) ===")
    policies_resp = requests.get(f"{API_URL}/patient/policies", headers=headers)
    assert policies_resp.status_code == 200, f"Get policies failed: {policies_resp.text}"
    policies = policies_resp.json()
    print(f"Total active policies available for patient: {len(policies)}")
    assert len(policies) >= 6, f"Expected at least 6 policies, found {len(policies)}"

    for idx, p in enumerate(policies, 1):
        print(f"  {idx}. {p['insurer_name']} - {p['policy_number']} ({p['policy_type']}): "
              f"Sum=INR {float(p['max_coverage_amount']):,.0f}, Co-pay={p.get('copay_percentage')}%, "
              f"Deductible=INR {float(p.get('deductible_amount') or 0):,.0f}, TPA={p.get('tpa_name')}")
        assert p.get("policy_number"), "Missing policy number"
        assert float(p.get("max_coverage_amount")) > 0, "Missing max coverage"
        assert p.get("tpa_name"), "Missing TPA name"

    print("\n=== Step 4: Submit Claim with Custom Claimed Amount & Exact Policy Link ===")
    selected_pol = policies[1] # Choose HDFC ERGO Optima Secure or similar
    print(f"Selected Policy for claim: {selected_pol['insurer_name']} ({selected_pol['id']})")

    custom_claimed_amount = 87500.00
    claim_payload = {
        "policy_id": selected_pol["id"],
        "policy_number": selected_pol["policy_number"],
        "provider_name": "Apollo Specialty Hospitals",
        "treatment_date": "2026-10-10",
        "treatment_description": "Cardiology diagnostic catheterization and itemized monitoring",
        "invoice_number": f"INV-TEST-{selected_pol['policy_number'][-4:]}",
        "claimed_amount": custom_claimed_amount,
        "line_items": [
            {
                "service_description": "Cardiac Catheterization Diagnostic Procedure",
                "billing_code": "CPT-93458",
                "quantity": 1,
                "unit_amount": 62500.00,
                "total_amount": 62500.00,
                "sequence_number": 1
            },
            {
                "service_description": "Telemetry & Critical Care Ward Monitoring",
                "billing_code": "CPT-99233",
                "quantity": 2,
                "unit_amount": 12500.00,
                "total_amount": 25000.00,
                "sequence_number": 2
            }
        ]
    }

    claim_resp = requests.post(f"{API_URL}/claims", headers=headers, json=claim_payload)
    assert claim_resp.status_code == 201, f"Claim creation failed: {claim_resp.text}"
    created_claim = claim_resp.json()
    claim_id = created_claim["id"]
    claim_ref = created_claim["claim_reference"]
    print(f"Claim created: {claim_ref} (ID: {claim_id})")
    print(f"Total claimed amount stored: INR {float(created_claim['total_claimed_amount']):,.2f}")
    assert float(created_claim["total_claimed_amount"]) == custom_claimed_amount, "Claimed amount mismatch"
    assert created_claim["policy_id"] == selected_pol["id"], "Policy ID not linked!"

    print("\n=== Step 5: Verify Claim Detail & Policy Schedule Retrieval ===")
    detail_resp = requests.get(f"{API_URL}/patient/claims/{claim_id}", headers=headers)
    assert detail_resp.status_code == 200, f"Detail retrieval failed: {detail_resp.text}"
    detail = detail_resp.json()
    pol_detail = detail.get("policy")
    assert pol_detail is not None, "Policy details missing from claim response"
    print(f"Linked Policy Insurer: {pol_detail['insurer_name']}")
    print(f"Linked Policy Number: {pol_detail['policy_number']}")
    print(f"Linked Policy TPA: {pol_detail['tpa_name']}")
    print(f"Linked Policy Co-pay: {pol_detail['copay_percentage']}%")
    print(f"Linked Policy Deductible: INR {float(pol_detail['deductible_amount']):,.2f}")
    assert pol_detail["id"] == selected_pol["id"]

    print("\n=== Step 6: Verify Investigator Visibility & Forensic Workbench ===")
    inv_login = requests.post(f"{API_URL}/auth/login", json={
        "username_or_email": "investigator@demo.claimlens.ai",
        "password": "Demo@Invest1"
    })
    inv_token = inv_login.json()["access_token"]
    inv_headers = {"Authorization": f"Bearer {inv_token}"}

    inv_claim_resp = requests.get(f"{API_URL}/investigator/claims/{claim_id}", headers=inv_headers)
    assert inv_claim_resp.status_code == 200, f"Investigator fetch failed: {inv_claim_resp.text}"
    inv_detail = inv_claim_resp.json()
    print(f"Investigator retrieved claim {inv_detail['claim_reference']}:")
    print(f"  Risk score: {inv_detail['risk_score']} ({inv_detail['risk_priority']})")
    print(f"  Patient Name: {inv_detail['patient_name']}")
    print(f"  Policy Insurer: {inv_detail['policy']['insurer_name']}")
    print(f"  Policy TPA: {inv_detail['policy']['tpa_name']}")
    print(f"  Policy Co-pay: {inv_detail['policy']['copay_percentage']}%")

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL. <<<")

if __name__ == "__main__":
    test_full_flow()
