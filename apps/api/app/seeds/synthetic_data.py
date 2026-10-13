import os
import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal, engine, Base
from app.auth import get_password_hash
from app.models import (
    User,
    PatientProfile,
    InsurancePolicy,
    Provider,
    Claim,
    ClaimLineItem,
    ClaimDocument,
    RiskAssessment,
    RiskFinding,
    DuplicateMatch,
    InvestigationNote,
    DocumentRequest,
    ClaimStatusHistory,
    Notification,
    AuditLog,
)
from app.services.risk_engine import risk_engine


def seed_synthetic_data(db: Session) -> None:
    """Seed comprehensive synthetic data including 25 patients, demo accounts, providers, policies, and 100+ claims."""
    # Check if already seeded
    existing_user_count = db.query(User).count()
    if existing_user_count >= 20:
        print("Database already contains data. Skipping seeding.")
        return

    print("Beginning database seeding...")

    # 1. Investigators & Admins
    investigator_pw = get_password_hash("Demo@Invest1")
    admin_pw = get_password_hash("Demo@Admin1")

    investigator_user = User(
        email="investigator@demo.claimlens.ai",
        username="investigator",
        full_name="Vikram Rathore",
        hashed_password=investigator_pw,
        role="investigator",
        is_active=True,
    )
    admin_user = User(
        email="admin@demo.claimlens.ai",
        username="admin",
        full_name="Anita Desai",
        hashed_password=admin_pw,
        role="admin",
        is_active=True,
    )
    db.add_all([investigator_user, admin_user])
    db.flush()

    # 2. Patients list (25 realistic Indian patients)
    patient_names = [
        ("Aarav Sharma", "patient1@demo.claimlens.ai", "patient1", "Demo@Patient1", "9820112233", "Mumbai, Maharashtra"),
        ("Priya Patel", "patient2@demo.claimlens.ai", "patient2", "Demo@Patient2", "9820223344", "Ahmedabad, Gujarat"),
        ("Rajesh Nair", "rajesh.nair@demo.claimlens.ai", "rajesh_nair", "Demo@Pass123", "9820334455", "Kochi, Kerala"),
        ("Deepa Iyer", "deepa.iyer@demo.claimlens.ai", "deepa_iyer", "Demo@Pass123", "9820445566", "Chennai, Tamil Nadu"),
        ("Rohan Verma", "rohan.verma@demo.claimlens.ai", "rohan_verma", "Demo@Pass123", "9820556677", "New Delhi, Delhi"),
        ("Sunita Rao", "sunita.rao@demo.claimlens.ai", "sunita_rao", "Demo@Pass123", "9820667788", "Bengaluru, Karnataka"),
        ("Amit Kumar", "amit.kumar@demo.claimlens.ai", "amit_kumar", "Demo@Pass123", "9820778899", "Patna, Bihar"),
        ("Kavita Menon", "kavita.menon@demo.claimlens.ai", "kavita_menon", "Demo@Pass123", "9820889900", "Thiruvananthapuram, Kerala"),
        ("Arjun Singh", "arjun.singh@demo.claimlens.ai", "arjun_singh", "Demo@Pass123", "9820990011", "Jaipur, Rajasthan"),
        ("Meera Joshi", "meera.joshi@demo.claimlens.ai", "meera_joshi", "Demo@Pass123", "9821001122", "Pune, Maharashtra"),
        ("Suresh Pillai", "suresh.pillai@demo.claimlens.ai", "suresh_pillai", "Demo@Pass123", "9821112233", "Coimbatore, Tamil Nadu"),
        ("Pooja Reddy", "pooja.reddy@demo.claimlens.ai", "pooja_reddy", "Demo@Pass123", "9821223344", "Hyderabad, Telangana"),
        ("Sanjay Gupta", "sanjay.gupta@demo.claimlens.ai", "sanjay_gupta", "Demo@Pass123", "9821334455", "Lucknow, Uttar Pradesh"),
        ("Neha Bansal", "neha.bansal@demo.claimlens.ai", "neha_bansal", "Demo@Pass123", "9821445566", "Chandigarh, Punjab"),
        ("Alok Sen", "alok.sen@demo.claimlens.ai", "alok_sen", "Demo@Pass123", "9821556677", "Kolkata, West Bengal"),
        ("Divya Nambiar", "divya.nambiar@demo.claimlens.ai", "divya_nambiar", "Demo@Pass123", "9821667788", "Kozhikode, Kerala"),
        ("Rahul Mukherjee", "rahul.mukherjee@demo.claimlens.ai", "rahul_mukherjee", "Demo@Pass123", "9821778899", "Kolkata, West Bengal"),
        ("Ritu Agarwal", "ritu.agarwal@demo.claimlens.ai", "ritu_agarwal", "Demo@Pass123", "9821889900", "Indore, Madhya Pradesh"),
        ("Manoj Hegde", "manoj.hegde@demo.claimlens.ai", "manoj_hegde", "Demo@Pass123", "9821990011", "Mangalore, Karnataka"),
        ("Swati Deshmukh", "swati.deshmukh@demo.claimlens.ai", "swati_deshmukh", "Demo@Pass123", "9822001122", "Nagpur, Maharashtra"),
        ("Karthik Subramanian", "karthik.s@demo.claimlens.ai", "karthik_s", "Demo@Pass123", "9822112233", "Madurai, Tamil Nadu"),
        ("Ananya Chatterjee", "ananya.c@demo.claimlens.ai", "ananya_c", "Demo@Pass123", "9822223344", "Siliguri, West Bengal"),
        ("Manish Tiwari", "manish.tiwari@demo.claimlens.ai", "manish_tiwari", "Demo@Pass123", "9822334455", "Varanasi, Uttar Pradesh"),
        ("Shilpa Kulkarni", "shilpa.k@demo.claimlens.ai", "shilpa_k", "Demo@Pass123", "9822445566", "Nashik, Maharashtra"),
        ("Gaurav Mehta", "gaurav.mehta@demo.claimlens.ai", "gaurav_mehta", "Demo@Pass123", "9822556677", "Surat, Gujarat"),
    ]

    patient_users = []
    patient_profiles = []

    for idx, (name, email, uname, pw, phone, addr) in enumerate(patient_names, start=1):
        u = User(
            email=email,
            username=uname,
            full_name=name,
            hashed_password=get_password_hash(pw),
            role="patient",
            is_active=True,
        )
        db.add(u)
        db.flush()

        dob = date(1975 + (idx % 25), 1 + (idx % 12), 1 + (idx % 27))
        profile = PatientProfile(
            user_id=u.id,
            date_of_birth=dob,
            phone=phone,
            address=addr,
            policy_number=f"POL-2024-{idx:04d}",
            member_reference=f"MEM-{idx:06d}",
        )
        db.add(profile)
        db.flush()

        patient_users.append(u)
        patient_profiles.append(profile)

    # 3. 10 Healthcare Providers
    provider_data = [
        ("Apollo Multi-Speciality Hospital", "PRV-APO-01", "Cardiology", "Tertiary Care", "Greams Road", "Chennai", "Tamil Nadu", "+91 44 2829 0200", "NPI-IND-00101", False, None),
        ("Max Super Speciality Hospital", "PRV-MAX-02", "Oncology", "Tertiary Care", "Saket", "New Delhi", "Delhi", "+91 11 2651 5050", "NPI-IND-00102", False, None),
        ("Fortis Memorial Research Institute", "PRV-FOR-03", "Orthopedics", "Tertiary Care", "Sector 44", "Gurugram", "Haryana", "+91 124 496 2200", "NPI-IND-00103", False, None),
        ("Manipal Hospital", "PRV-MAN-04", "Neurology", "Super Speciality", "HAL Old Airport Rd", "Bengaluru", "Karnataka", "+91 80 2502 4444", "NPI-IND-00104", False, None),
        ("Medanta - The Medicity", "PRV-MED-05", "General Surgery", "Multi Speciality", "CH Bakhtawar Singh Rd", "Gurugram", "Haryana", "+91 124 414 1414", "NPI-IND-00105", False, None),
        ("Narayana Health City", "PRV-NAR-06", "Cardiology", "Super Speciality", "Bommasandra", "Bengaluru", "Karnataka", "+91 80 7122 2222", "NPI-IND-00106", False, None),
        ("Tata Memorial Hospital", "PRV-TAT-07", "Oncology", "Speciality", "Parel", "Mumbai", "Maharashtra", "+91 22 2417 7000", "NPI-IND-00107", False, None),
        ("Lilavati Hospital", "PRV-LIL-08", "Nephrology", "Multi Speciality", "Bandra West", "Mumbai", "Maharashtra", "+91 22 2675 1000", "NPI-IND-00108", False, None),
        ("Global Health Metro Clinic", "PRV-GLO-09", "General Medicine", "Day Care / Clinic", "MG Road", "Bengaluru", "Karnataka", "+91 80 4012 3456", "NPI-IND-00109", True, "Flagged for repeated unbundled charges and billing anomalies"),
        ("City Care Surgical Centre", "PRV-CIT-10", "Ophthalmology", "Ambulatory Surgical", "Andheri East", "Mumbai", "Maharashtra", "+91 22 2834 9900", "NPI-IND-00110", False, None),
    ]

    providers = []
    for name, code, spec, htype, addr, city, state, ph, npi, is_fl, reason in provider_data:
        p = Provider(
            name=name,
            provider_code=code,
            specialty=spec,
            hospital_type=htype,
            address=addr,
            city=city,
            state=state,
            phone=ph,
            npi_number=npi,
            is_flagged=is_fl,
            flag_reason=reason,
        )
        db.add(p)
        db.flush()
        providers.append(p)

    # 4. 5 Policies per Patient (25 * 5 = 125 policies)
    insurers = [
        ("Star Health & Allied Insurance", "individual", Decimal("500000.00")),
        ("HDFC ERGO General Insurance", "family", Decimal("1000000.00")),
        ("ICICI Lombard Health Shield", "group", Decimal("750000.00")),
        ("Care Health Supreme", "corporate", Decimal("1500000.00")),
        ("Bajaj Allianz Health Guard", "individual", Decimal("400000.00")),
    ]

    policies_by_patient = {}
    for p_idx, profile in enumerate(patient_profiles):
        policies_by_patient[profile.id] = []
        for i_idx, (ins_name, p_type, max_amt) in enumerate(insurers):
            pol = InsurancePolicy(
                patient_id=profile.id,
                policy_number=f"POL-{profile.user_id[:6].upper()}-{i_idx+1}",
                member_reference=f"MEM-{profile.user_id[:4].upper()}-{i_idx+1}",
                policy_type=p_type,
                insurer_name=ins_name,
                coverage_start=date(2023, 1, 1),
                coverage_end=date(2027, 12, 31),
                max_coverage_amount=max_amt,
                is_active=True,
            )
            db.add(pol)
            db.flush()
            policies_by_patient[profile.id].append(pol)

    # 5. Build 100+ Claims with Known Scenarios
    # Helper to create claim documents
    def attach_doc(claim, doc_type, filename):
        doc = ClaimDocument(
            claim_id=claim.id,
            document_type=doc_type,
            filename=filename,
            file_path=os.path.join(settings.UPLOAD_DIR, claim.id, filename),
            file_size=1024 * 45,
            mime_type="application/pdf",
            uploaded_by_id=patient_users[0].id,
        )
        db.add(doc)
        db.flush()
        return doc

    all_claims = []
    base_date = date.today() - timedelta(days=200)

    # --- Scenario 1: Clean Claim (Low risk, valid dates, normal amount, hospital invoice attached) ---
    clean_p = patient_profiles[0]
    clean_policy = policies_by_patient[clean_p.id][0]
    clean_claim = Claim(
        claim_reference="CLM-202601-0001",
        patient_id=clean_p.id,
        policy_id=clean_policy.id,
        provider_id=providers[0].id,
        treatment_date=base_date + timedelta(days=10),
        admission_date=base_date + timedelta(days=9),
        discharge_date=base_date + timedelta(days=11),
        treatment_description="Routine angioplasty follow-up and diagnostic evaluation",
        invoice_number="INV-CLEAN-1001",
        total_claimed_amount=Decimal("45000.00"),
        status="settled",
        risk_score=Decimal("0.00"),
        risk_priority="low",
        is_synthetic=True,
    )
    db.add(clean_claim)
    db.flush()
    attach_doc(clean_claim, "hospital_invoice", "invoice_clean.pdf")
    attach_doc(clean_claim, "discharge_summary", "discharge_summary_clean.pdf")

    # Line items for clean claim
    db.add(ClaimLineItem(claim_id=clean_claim.id, service_description="Consultation fee", billing_code="MED-101", quantity=1, unit_amount=Decimal("5000.00"), line_total=Decimal("5000.00"), sequence_number=1))
    db.add(ClaimLineItem(claim_id=clean_claim.id, service_description="Echocardiogram", billing_code="CARD-201", quantity=1, unit_amount=Decimal("20000.00"), line_total=Decimal("20000.00"), sequence_number=2))
    db.add(ClaimLineItem(claim_id=clean_claim.id, service_description="Medication supplies", billing_code="PHARM-01", quantity=1, unit_amount=Decimal("20000.00"), line_total=Decimal("20000.00"), sequence_number=3))
    db.flush()
    all_claims.append(clean_claim)

    # --- Scenario 2: Exact Duplicate ---
    # Same invoice_number, provider, and patient as clean_claim!
    exact_dup_claim = Claim(
        claim_reference="CLM-202601-0002",
        patient_id=clean_p.id,
        policy_id=clean_policy.id,
        provider_id=providers[0].id,
        treatment_date=clean_claim.treatment_date,
        treatment_description="Duplicate submission of cardiology bill",
        invoice_number="INV-CLEAN-1001",  # EXACT SAME INVOICE
        total_claimed_amount=Decimal("45000.00"),
        status="under_review",
        risk_score=Decimal("40.00"),
        risk_priority="medium",
        is_synthetic=True,
    )
    db.add(exact_dup_claim)
    db.flush()
    attach_doc(exact_dup_claim, "hospital_invoice", "dup_invoice.pdf")
    all_claims.append(exact_dup_claim)

    # --- Scenario 3: Near-Duplicate ---
    # Same patient, same provider, dates 3 days apart, amount 5% different
    near_dup_claim = Claim(
        claim_reference="CLM-202601-0003",
        patient_id=clean_p.id,
        policy_id=clean_policy.id,
        provider_id=providers[0].id,
        treatment_date=clean_claim.treatment_date + timedelta(days=3),  # 3 days apart
        treatment_description="Cardiology follow up consultation",
        invoice_number="INV-NEAR-1002",
        total_claimed_amount=Decimal("47250.00"),  # 5% different
        status="under_review",
        risk_score=Decimal("30.00"),
        risk_priority="medium",
        is_synthetic=True,
    )
    db.add(near_dup_claim)
    db.flush()
    attach_doc(near_dup_claim, "hospital_invoice", "near_inv.pdf")
    all_claims.append(near_dup_claim)

    # --- Scenario 4: Itemized Mismatch ---
    # total != sum of lines (off by ₹500)
    mismatch_p = patient_profiles[1]
    mismatch_pol = policies_by_patient[mismatch_p.id][0]
    mismatch_claim = Claim(
        claim_reference="CLM-202601-0004",
        patient_id=mismatch_p.id,
        policy_id=mismatch_pol.id,
        provider_id=providers[1].id,
        treatment_date=base_date + timedelta(days=15),
        treatment_description="Oncology consultation and chemo support therapy",
        invoice_number="INV-MISMATCH-1003",
        total_claimed_amount=Decimal("30500.00"),  # Total is 30500
        status="under_review",
        risk_score=Decimal("25.00"),
        risk_priority="medium",
        is_synthetic=True,
    )
    db.add(mismatch_claim)
    db.flush()
    # Line items sum to 30000.00 (difference of 500.00)
    db.add(ClaimLineItem(claim_id=mismatch_claim.id, service_description="Oncology consultation", billing_code="MED-102", quantity=1, unit_amount=Decimal("10000.00"), line_total=Decimal("10000.00"), sequence_number=1))
    db.add(ClaimLineItem(claim_id=mismatch_claim.id, service_description="Chemo administration", billing_code="ONC-201", quantity=1, unit_amount=Decimal("20000.00"), line_total=Decimal("20000.00"), sequence_number=2))
    db.flush()
    attach_doc(mismatch_claim, "hospital_invoice", "onc_inv.pdf")
    all_claims.append(mismatch_claim)

    # --- Scenario 5: Coding Inconsistency ---
    # Incompatible billing code combo: SURG-101 and SURG-102
    coding_p = patient_profiles[2]
    coding_pol = policies_by_patient[coding_p.id][0]
    coding_claim = Claim(
        claim_reference="CLM-202601-0005",
        patient_id=coding_p.id,
        policy_id=coding_pol.id,
        provider_id=providers[2].id,
        treatment_date=base_date + timedelta(days=20),
        treatment_description="Orthopedic knee arthroscopy",
        invoice_number="INV-CODE-1004",
        total_claimed_amount=Decimal("60000.00"),
        status="under_review",
        risk_score=Decimal("35.00"),
        risk_priority="medium",
        is_synthetic=True,
    )
    db.add(coding_claim)
    db.flush()
    # Mutually exclusive surgical procedures
    db.add(ClaimLineItem(claim_id=coding_claim.id, service_description="Primary Knee Arthroscopy", billing_code="SURG-101", quantity=1, unit_amount=Decimal("30000.00"), line_total=Decimal("30000.00"), sequence_number=1))
    db.add(ClaimLineItem(claim_id=coding_claim.id, service_description="Secondary Open Arthrotomy", billing_code="SURG-102", quantity=1, unit_amount=Decimal("30000.00"), line_total=Decimal("30000.00"), sequence_number=2))
    db.flush()
    attach_doc(coding_claim, "hospital_invoice", "ortho_inv.pdf")
    all_claims.append(coding_claim)

    # --- Scenario 6: High Amount ---
    # Amount > 3 std devs above specialty average
    high_amt_p = patient_profiles[3]
    high_amt_pol = policies_by_patient[high_amt_p.id][0]
    high_amt_claim = Claim(
        claim_reference="CLM-202601-0006",
        patient_id=high_amt_p.id,
        policy_id=high_amt_pol.id,
        provider_id=providers[9].id,  # City Care Surgical Centre (Ophthalmology)
        treatment_date=base_date + timedelta(days=25),
        treatment_description="Cataract lens replacement",
        invoice_number="INV-HIGH-1005",
        total_claimed_amount=Decimal("485000.00"),  # Normal is 20,000-40,000
        status="under_review",
        risk_score=Decimal("40.00"),
        risk_priority="medium",
        is_synthetic=True,
    )
    db.add(high_amt_claim)
    db.flush()
    attach_doc(high_amt_claim, "hospital_invoice", "eye_inv.pdf")
    all_claims.append(high_amt_claim)

    # --- Scenario 7: Missing Docs ---
    # Hospital stay claim with no discharge summary (>50k and hospital stay)
    missing_p = patient_profiles[4]
    missing_pol = policies_by_patient[missing_p.id][0]
    missing_claim = Claim(
        claim_reference="CLM-202601-0007",
        patient_id=missing_p.id,
        policy_id=missing_pol.id,
        provider_id=providers[3].id,
        treatment_date=base_date + timedelta(days=30),
        admission_date=base_date + timedelta(days=28),
        discharge_date=base_date + timedelta(days=31),
        treatment_description="Inpatient neurological monitoring and MRI",
        invoice_number="INV-MISSING-1006",
        total_claimed_amount=Decimal("85000.00"),  # > 50k and admission set, but NO documents uploaded
        status="documentation_requested",
        risk_score=Decimal("30.00"),
        risk_priority="medium",
        is_synthetic=True,
    )
    db.add(missing_claim)
    db.flush()
    # Intentionally NO documents attached
    all_claims.append(missing_claim)

    # --- Scenario 8: Invalid Dates ---
    # discharge before admission
    dates_p = patient_profiles[5]
    dates_pol = policies_by_patient[dates_p.id][0]
    dates_claim = Claim(
        claim_reference="CLM-202601-0008",
        patient_id=dates_p.id,
        policy_id=dates_pol.id,
        provider_id=providers[4].id,
        treatment_date=base_date + timedelta(days=35),
        admission_date=base_date + timedelta(days=36),  # Admission after discharge
        discharge_date=base_date + timedelta(days=34),  # Discharge before admission
        treatment_description="Day care hernia repair",
        invoice_number="INV-DATES-1007",
        total_claimed_amount=Decimal("32000.00"),
        status="under_review",
        risk_score=Decimal("25.00"),
        risk_priority="medium",
        is_synthetic=True,
    )
    db.add(dates_claim)
    db.flush()
    attach_doc(dates_claim, "hospital_invoice", "dates_inv.pdf")
    all_claims.append(dates_claim)

    # --- Scenario 9: Recurring Treatment ---
    # Legitimate monthly diabetes management
    rec_p = patient_profiles[6]
    rec_pol = policies_by_patient[rec_p.id][0]
    rec_claim = Claim(
        claim_reference="CLM-202601-0009",
        patient_id=rec_p.id,
        policy_id=rec_pol.id,
        provider_id=providers[4].id,
        treatment_date=base_date + timedelta(days=40),
        treatment_description="Chronic diabetes management monthly consultation & insulin supply",
        invoice_number="INV-REC-1008",
        total_claimed_amount=Decimal("8500.00"),
        status="approved",
        risk_score=Decimal("0.00"),
        risk_priority="low",
        is_synthetic=True,
    )
    db.add(rec_claim)
    db.flush()
    attach_doc(rec_claim, "hospital_invoice", "rec_inv.pdf")
    all_claims.append(rec_claim)

    # --- Scenario 10: False Positive ---
    # Was flagged but investigator marked as false positive
    fp_p = patient_profiles[7]
    fp_pol = policies_by_patient[fp_p.id][0]
    fp_claim = Claim(
        claim_reference="CLM-202601-0010",
        patient_id=fp_p.id,
        policy_id=fp_pol.id,
        provider_id=providers[5].id,
        treatment_date=base_date + timedelta(days=45),
        treatment_description="Emergency acute cardiac evaluation",
        invoice_number="INV-FP-1009",
        total_claimed_amount=Decimal("42000.00"),
        status="approved",
        risk_score=Decimal("0.00"),
        risk_priority="low",
        is_synthetic=True,
    )
    db.add(fp_claim)
    db.flush()
    attach_doc(fp_claim, "hospital_invoice", "fp_inv.pdf")
    all_claims.append(fp_claim)

    # --- Generate Remaining 95+ Claims to exceed 100 total ---
    statuses = [
        "submitted", "validation", "risk_screening", "under_review",
        "documentation_requested", "approved", "partially_approved",
        "rejected", "payment_processing", "settled"
    ]
    descriptions = [
        "Comprehensive health checkup and lipid panel",
        "Appendectomy post-operative care and suture removal",
        "MRI Spine and physical rehabilitation session",
        "Emergency ward trauma dressing and tetanus prophylaxis",
        "Pediatric nebulization and acute bronchitis treatment",
        "Dermatology biopsy and histopathology testing",
        "Dialysis session for chronic renal failure",
        "Chemotherapy infusion cycle #3",
        "Cataract surgery with multifocal intraocular lens",
        "Coronary angiogram via right radial artery",
        "Knee joint hyaluronic acid injection",
        "Dental extraction under local anesthesia",
        "Gastroenterology endoscopy and biopsy",
        "ENT sinus endoscopy and medication",
        "General physician fever evaluation and dengue test",
    ]

    claim_counter = 11
    while len(all_claims) < 110:
        p_idx = (claim_counter - 1) % len(patient_profiles)
        p = patient_profiles[p_idx]
        pol = policies_by_patient[p.id][claim_counter % 5]
        prv = providers[claim_counter % len(providers)]

        t_date = base_date + timedelta(days=(claim_counter * 3) % 220)
        c_status = statuses[claim_counter % len(statuses)]
        desc = descriptions[claim_counter % len(descriptions)]

        amt = Decimal(str(3500 + ((claim_counter * 1731) % 120000)))

        c = Claim(
            claim_reference=f"CLM-20260{1 + (claim_counter % 9)}-{claim_counter:04d}",
            patient_id=p.id,
            policy_id=pol.id,
            provider_id=prv.id,
            treatment_date=t_date,
            admission_date=t_date - timedelta(days=1) if claim_counter % 3 == 0 else None,
            discharge_date=t_date + timedelta(days=2) if claim_counter % 3 == 0 else None,
            treatment_description=desc,
            invoice_number=f"INV-GEN-{claim_counter:05d}",
            total_claimed_amount=amt,
            status=c_status,
            risk_score=Decimal("0.00"),
            risk_priority="low",
            is_synthetic=True,
        )
        db.add(c)
        db.flush()

        # Add line items to 70% of claims
        if claim_counter % 3 != 0:
            half_amt = (amt / Decimal("2")).quantize(Decimal("0.01"))
            db.add(ClaimLineItem(claim_id=c.id, service_description="Primary Service Charge", billing_code="SRV-01", quantity=1, unit_amount=half_amt, line_total=half_amt, sequence_number=1))
            db.add(ClaimLineItem(claim_id=c.id, service_description="Diagnostic & Pharmacy", billing_code="PHARM-02", quantity=1, unit_amount=amt - half_amt, line_total=amt - half_amt, sequence_number=2))
            db.flush()

        # Attach documents to 80% of claims
        if claim_counter % 5 != 0:
            attach_doc(c, "hospital_invoice", f"invoice_{claim_counter}.pdf")
            if c.admission_date:
                attach_doc(c, "discharge_summary", f"discharge_{claim_counter}.pdf")

        all_claims.append(c)
        claim_counter += 1

    db.commit()
    print(f"Total claims created: {len(all_claims)}")

    # 6. Run Risk Screening & Create Assessments for All Claims
    print("Executing risk engine screening across all claims...")
    for claim in all_claims:
        try:
            assessment = risk_engine.screen_claim(db, claim.id)
            # If this is scenario 10 (false positive), mark finding as false positive
            if claim.claim_reference == "CLM-202601-0010":
                for f in assessment.findings:
                    f.is_false_positive = True
                    f.false_positive_reason = "Physician verified acute emergency cardiac procedure."
                    f.false_positive_by_id = investigator_user.id
                    f.false_positive_at = datetime.utcnow()
                assessment.score = Decimal("0.00")
                assessment.priority = "low"
                claim.risk_score = Decimal("0.00")
                claim.risk_priority = "low"
                db.commit()
        except Exception as e:
            print(f"Error screening claim {claim.claim_reference}: {e}")

    # 7. Add Status Histories, Notes, and Audit Logs
    print("Generating status history, notes, and audit trails...")
    for c in all_claims[:20]:
        history = ClaimStatusHistory(
            claim_id=c.id,
            from_status="submitted",
            to_status=c.status,
            changed_by_id=investigator_user.id,
            reason="Initial intake screening and adjudication processing",
            timestamp=c.created_at + timedelta(hours=2),
        )
        db.add(history)

    # Add private notes to high risk claims
    high_claims = db.query(Claim).filter(Claim.risk_priority.in_(["high", "critical"])).limit(10).all()
    for hc in high_claims:
        note = InvestigationNote(
            claim_id=hc.id,
            author_id=investigator_user.id,
            content=f"Investigator flagged claim {hc.claim_reference} for in-depth billing audit due to {hc.risk_priority} priority score ({hc.risk_score}).",
            is_private=True,
        )
        db.add(note)

    # Add sample audit log records
    for c in all_claims[:15]:
        log_entry = AuditLog(
            actor_id=investigator_user.id,
            action="claim_audited",
            entity_type="claim",
            entity_id=c.id,
            old_value=json.dumps({"status": "submitted"}),
            new_value=json.dumps({"status": c.status, "risk_score": str(c.risk_score)}),
            ip_address="127.0.0.1",
        )
        db.add(log_entry)

    db.commit()
    print("Synthetic data generation completed successfully!")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        Base.metadata.create_all(bind=engine)
        seed_synthetic_data(db)
    finally:
        db.close()
