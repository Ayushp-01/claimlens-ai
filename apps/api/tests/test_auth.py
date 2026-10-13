import pytest
from fastapi import status


def test_register_patient(client):
    """Test patient registration endpoint creates user and patient profile."""
    payload = {
        "email": "newpatient@example.com",
        "username": "newpatient",
        "full_name": "Rohan Test Gupta",
        "password": "SecurePassword123!",
        "role": "patient",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newpatient@example.com"
    assert data["username"] == "newpatient"
    assert data["role"] == "patient"
    assert "id" in data


def test_register_duplicate_email(client, test_patient):
    """Test duplicate email registration returns 400."""
    payload = {
        "email": test_patient.email,
        "username": "unique_username",
        "full_name": "Duplicate Person",
        "password": "Password123!",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_login_success(client, test_patient):
    """Test login with valid credentials returns JWT access token."""
    payload = {
        "username_or_email": test_patient.email,
        "password": "Password123!",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["id"] == test_patient.id


def test_login_wrong_password(client, test_patient):
    """Test login with incorrect password returns 401."""
    payload = {
        "username_or_email": test_patient.email,
        "password": "WrongPassword!",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_profile_me(client, test_patient, patient_token):
    """Test GET /auth/me returns current authenticated user details."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_patient.id
    assert data["email"] == test_patient.email


def test_get_profile_unauthenticated(client):
    """Test unauthenticated request to /auth/me returns 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_role_enforcement(client, patient_token, investigator_token):
    """Test role-based access control stops unauthorized access."""
    # Patient attempting to access investigator dashboard -> 403 Forbidden
    resp1 = client.get(
        "/api/investigator/dashboard",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert resp1.status_code == status.HTTP_403_FORBIDDEN

    # Investigator attempting to access patient dashboard -> 403 Forbidden
    resp2 = client.get(
        "/api/patient/dashboard",
        headers={"Authorization": f"Bearer {investigator_token}"},
    )
    assert resp2.status_code == status.HTTP_403_FORBIDDEN

    # Investigator accessing investigator dashboard -> 200 OK
    resp3 = client.get(
        "/api/investigator/dashboard",
        headers={"Authorization": f"Bearer {investigator_token}"},
    )
    assert resp3.status_code == status.HTTP_200_OK
