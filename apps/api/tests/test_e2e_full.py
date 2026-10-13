import requests

BASE_URL = 'http://127.0.0.1:8000/api'

def run_tests():
    # 1. Login Patient
    p_res = requests.post(f'{BASE_URL}/auth/login', json={'username_or_email': 'patient1@demo.claimlens.ai', 'password': 'Demo@Patient1'})
    assert p_res.status_code == 200, f'Patient login failed: {p_res.text}'
    p_token = p_res.json()['access_token']
    p_headers = {'Authorization': f'Bearer {p_token}'}
    print('[PASS] Patient logged in successfully')

    # 2. Login Investigator
    i_res = requests.post(f'{BASE_URL}/auth/login', json={'username_or_email': 'investigator@demo.claimlens.ai', 'password': 'Demo@Invest1'})
    assert i_res.status_code == 200, f'Investigator login failed: {i_res.text}'
    i_token = i_res.json()['access_token']
    i_headers = {'Authorization': f'Bearer {i_token}'}
    print('[PASS] Investigator logged in successfully')

    # 3. Patient submits claim 1 (to be rejected)
    policies = requests.get(f'{BASE_URL}/patient/policies', headers=p_headers).json()
    assert len(policies) > 0, 'No policies found'
    pol = policies[0]

    submit_body = {
        'policy_id': pol['id'],
        'provider_name': 'Max Healthcare',
        'treatment_date': '2026-10-10',
        'treatment_description': 'Consultation & Emergency Treatment for Severe Migraine',
        'invoice_number': f'INV-TEST-REJECT-999',
        'total_claimed_amount': 45000.00,
        'line_items': [
            {'service_description': 'Emergency Consultation', 'billing_code': 'CPT-99285', 'quantity': 1, 'unit_amount': 15000.00, 'line_total': 15000.00},
            {'service_description': 'Diagnostic Brain Scan', 'billing_code': 'CPT-70450', 'quantity': 1, 'unit_amount': 30000.00, 'line_total': 30000.00}
        ]
    }
    sub_res = requests.post(f'{BASE_URL}/patient/claims', json=submit_body, headers=p_headers)
    assert sub_res.status_code == 201, f'Claim submission failed: {sub_res.text}'
    claim1 = sub_res.json()
    claim1_id = claim1['id']
    print(f'[PASS] Claim submitted: {claim1.get("claim_reference")} (ID: {claim1_id}), Status: {claim1.get("status")}, Risk Score: {claim1.get("risk_score")}')

    # 4. Check that investigator sees it in queue
    queue_res = requests.get(f'{BASE_URL}/investigator/claims?queue_type=all', headers=i_headers)
    assert queue_res.status_code == 200
    q_items = queue_res.json()['items']
    found = any(c['id'] == claim1_id for c in q_items)
    assert found, 'Newly submitted claim not found in investigator queue'
    print('[PASS] Claim immediately visible in Investigator queue')

    # 5. Investigator rejects claim
    reject_body = {
        'decision': 'reject',
        'reason': 'Diagnostic scan performed outside policy coverage network with non-accredited emergency referral.',
        'notes': 'Verified with provider registry: Facility code mismatch.',
        'approved_amount': 0.00
    }
    dec_res = requests.post(f'{BASE_URL}/investigator/claims/{claim1_id}/decision', json=reject_body, headers=i_headers)
    assert dec_res.status_code == 200, f'Rejection failed: {dec_res.text}'
    dec_data = dec_res.json()
    assert dec_data['status'] == 'rejected', f'Expected rejected, got {dec_data.get("status")}'
    assert float(dec_data['approved_amount'] or 0) == 0.0, f'Expected approved amount 0, got {dec_data.get("approved_amount")}'
    assert 'outside policy coverage' in (dec_data.get('rejection_reason') or ''), 'Rejection reason not stored'
    print(f'[PASS] Claim rejected by investigator. Status: {dec_data.get("status")}, Approved: INR {dec_data.get("approved_amount")}, Reason: {dec_data.get("rejection_reason")}')

    # 6. Patient views claim detail
    p_claim_res = requests.get(f'{BASE_URL}/patient/claims/{claim1_id}', headers=p_headers)
    assert p_claim_res.status_code == 200, f'Patient get claim failed: {p_claim_res.text}'
    p_claim_data = p_claim_res.json()
    assert p_claim_data['status'] == 'rejected'
    assert float(p_claim_data['approved_amount'] or 0) == 0.0
    assert 'outside policy coverage' in (p_claim_data.get('rejection_reason') or '')
    assert 'Investigation closed' in (p_claim_data.get('status_explanations') or '')
    print(f'[PASS] Patient sees canonical rejected status, INR 0.00 payout, and friendly explanation: {p_claim_data.get("status_explanations")}')

    # 7. Patient submits claim 2 (to be approved & settled)
    submit_body2 = {
        'policy_id': pol['id'],
        'provider_name': 'Apollo Hospitals',
        'treatment_date': '2026-10-11',
        'treatment_description': 'Daycare Cataract Surgery Routine Procedure',
        'invoice_number': f'INV-TEST-APPROVE-888',
        'total_claimed_amount': 32000.00,
        'line_items': [
            {'service_description': 'Phacoemulsification Cataract Procedure', 'billing_code': 'CPT-66984', 'quantity': 1, 'unit_amount': 32000.00, 'line_total': 32000.00}
        ]
    }
    sub_res2 = requests.post(f'{BASE_URL}/patient/claims', json=submit_body2, headers=p_headers)
    assert sub_res2.status_code == 201
    claim2 = sub_res2.json()
    claim2_id = claim2['id']

    # 8. Investigator approves claim 2
    app_body = {
        'decision': 'approve',
        'reason': 'All clinical documentation verified against daycare schedule.',
        'approved_amount': 32000.00
    }
    app_res = requests.post(f'{BASE_URL}/investigator/claims/{claim2_id}/decision', json=app_body, headers=i_headers)
    assert app_res.status_code == 200
    app_data = app_res.json()
    assert app_data['status'] == 'approved'
    assert float(app_data['approved_amount']) == 32000.00
    print(f'[PASS] Claim 2 approved. Status: {app_data.get("status")}, Approved: INR {app_data.get("approved_amount")}')

    # 9. Investigator settles claim 2
    settle_body = {
        'decision': 'settle',
        'reason': 'Direct NEFT disbursement verified with payment gateway partner.'
    }
    set_res = requests.post(f'{BASE_URL}/investigator/claims/{claim2_id}/decision', json=settle_body, headers=i_headers)
    assert set_res.status_code == 200
    set_data = set_res.json()
    assert set_data['status'] == 'settled'
    assert float(set_data['settled_amount']) == 32000.00
    print(f'[PASS] Claim 2 settled. Status: {set_data.get("status")}, Settled: INR {set_data.get("settled_amount")}')

    # 10. Check investigator dashboard KPIs recalculate
    kpi_res = requests.get(f'{BASE_URL}/investigator/dashboard', headers=i_headers)
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()
    assert float(kpis['approved_amount']) > 0
    assert float(kpis['rejected_amount']) > 0
    print(f'[PASS] Investigator Dashboard KPIs recalculated: Total={kpis.get("total_claims")}, Approved=INR {kpis.get("approved_amount")}, Settled=INR {kpis.get("settled_amount")}, Rejected=INR {kpis.get("rejected_amount")}')

    # 11. Test Document Request endpoint
    doc_req_body = {
        'document_types': ['discharge_summary', 'hospital_invoice'],
        'message': 'Please submit signed indoor case papers.',
        'due_date': '2026-10-25'
    }
    doc_res = requests.post(f'{BASE_URL}/investigator/claims/{claim1_id}/request-documents', json=doc_req_body, headers=i_headers)
    assert doc_res.status_code == 200
    print(f'[PASS] Document request endpoint (/request-documents) works: ID={doc_res.json().get("id")}')

    # 12. Test duplicate matches endpoint and resolution
    dup_list = requests.get(f'{BASE_URL}/investigator/duplicates', headers=i_headers).json()
    if dup_list:
        dup_id = dup_list[0]['id']
        res_dup = requests.post(f'{BASE_URL}/investigator/duplicates/{dup_id}/resolve', json={'status': 'confirmed_duplicate', 'notes': 'Dual filing confirmed'}, headers=i_headers)
        assert res_dup.status_code == 200
        print(f'[PASS] Duplicate match resolved: {res_dup.json()}')

    print('\n' + '='*55)
    print('ALL 12 END-TO-END WORKFLOW TESTS PASSED 100%!')
    print('='*55)

if __name__ == '__main__':
    run_tests()
