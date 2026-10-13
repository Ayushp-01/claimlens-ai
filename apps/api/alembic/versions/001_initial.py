"""Initial database schema migration

Revision ID: 001_initial
Revises: 
Create Date: 2026-10-13 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='patient'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 2. patient_profiles
    op.create_table(
        'patient_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('policy_number', sa.String(length=100), nullable=True),
        sa.Column('member_reference', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )

    # 3. insurance_policies
    op.create_table(
        'insurance_policies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('patient_id', sa.String(length=36), nullable=False),
        sa.Column('policy_number', sa.String(length=100), nullable=False),
        sa.Column('member_reference', sa.String(length=100), nullable=True),
        sa.Column('policy_type', sa.String(length=50), nullable=False, server_default='individual'),
        sa.Column('insurer_name', sa.String(length=255), nullable=False),
        sa.Column('coverage_start', sa.Date(), nullable=False),
        sa.Column('coverage_end', sa.Date(), nullable=False),
        sa.Column('max_coverage_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_insurance_policies_policy_number'), 'insurance_policies', ['policy_number'], unique=False)

    # 4. providers
    op.create_table(
        'providers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('provider_code', sa.String(length=100), nullable=False),
        sa.Column('specialty', sa.String(length=100), nullable=False),
        sa.Column('hospital_type', sa.String(length=100), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('npi_number', sa.String(length=100), nullable=True),
        sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('flag_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_providers_provider_code'), 'providers', ['provider_code'], unique=True)

    # 5. claims
    op.create_table(
        'claims',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('claim_reference', sa.String(length=50), nullable=False),
        sa.Column('patient_id', sa.String(length=36), nullable=False),
        sa.Column('policy_id', sa.String(length=36), nullable=False),
        sa.Column('provider_id', sa.String(length=36), nullable=False),
        sa.Column('treatment_date', sa.Date(), nullable=False),
        sa.Column('admission_date', sa.Date(), nullable=True),
        sa.Column('discharge_date', sa.Date(), nullable=True),
        sa.Column('treatment_description', sa.Text(), nullable=False),
        sa.Column('invoice_number', sa.String(length=100), nullable=False),
        sa.Column('total_claimed_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='submitted'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('assigned_investigator_id', sa.String(length=36), nullable=True),
        sa.Column('risk_score', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'),
        sa.Column('risk_priority', sa.String(length=20), nullable=False, server_default='low'),
        sa.Column('is_synthetic', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(['assigned_investigator_id'], ['users.id']),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id']),
        sa.ForeignKeyConstraint(['policy_id'], ['insurance_policies.id']),
        sa.ForeignKeyConstraint(['provider_id'], ['providers.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_claims_claim_reference'), 'claims', ['claim_reference'], unique=True)
    op.create_index(op.f('ix_claims_invoice_number'), 'claims', ['invoice_number'], unique=False)

    # 6. claim_line_items
    op.create_table(
        'claim_line_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('claim_id', sa.String(length=36), nullable=False),
        sa.Column('service_description', sa.String(length=255), nullable=False),
        sa.Column('billing_code', sa.String(length=50), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('line_total', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('sequence_number', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 7. claim_documents
    op.create_table(
        'claim_documents',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('claim_id', sa.String(length=36), nullable=False),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('uploaded_by_id', sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # 8. risk_assessments
    op.create_table(
        'risk_assessments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('claim_id', sa.String(length=36), nullable=False),
        sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('rule_version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('assessed_at', sa.DateTime(), nullable=False),
        sa.Column('triggered_rule_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_latest', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 9. risk_findings
    op.create_table(
        'risk_findings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('assessment_id', sa.String(length=36), nullable=False),
        sa.Column('claim_id', sa.String(length=36), nullable=False),
        sa.Column('rule_id', sa.String(length=50), nullable=False),
        sa.Column('rule_name', sa.String(length=255), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('score_contribution', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('evidence', sa.Text(), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('recommended_action', sa.Text(), nullable=True),
        sa.Column('is_false_positive', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('false_positive_reason', sa.Text(), nullable=True),
        sa.Column('false_positive_by_id', sa.String(length=36), nullable=True),
        sa.Column('false_positive_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assessment_id'], ['risk_assessments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['false_positive_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # 10. duplicate_matches
    op.create_table(
        'duplicate_matches',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('claim_id_1', sa.String(length=36), nullable=False),
        sa.Column('claim_id_2', sa.String(length=36), nullable=False),
        sa.Column('match_type', sa.String(length=20), nullable=False),
        sa.Column('similarity_score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('matching_fields', sa.Text(), nullable=True),
        sa.Column('differing_fields', sa.Text(), nullable=True),
        sa.Column('confirmed_duplicate', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('confirmed_by_id', sa.String(length=36), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['claim_id_1'], ['claims.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['claim_id_2'], ['claims.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['confirmed_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # 11. investigation_notes
    op.create_table(
        'investigation_notes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('claim_id', sa.String(length=36), nullable=False),
        sa.Column('author_id', sa.String(length=36), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_private', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id']),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 12. document_requests
    op.create_table(
        'document_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('claim_id', sa.String(length=36), nullable=False),
        sa.Column('requested_by_id', sa.String(length=36), nullable=False),
        sa.Column('document_types', sa.Text(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('fulfilled_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # 13. claim_status_history
    op.create_table(
        'claim_status_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('claim_id', sa.String(length=36), nullable=False),
        sa.Column('from_status', sa.String(length=50), nullable=True),
        sa.Column('to_status', sa.String(length=50), nullable=False),
        sa.Column('changed_by_id', sa.String(length=36), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['changed_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 14. notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('claim_id', sa.String(length=36), nullable=True),
        sa.Column('notification_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 15. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=50), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('notifications')
    op.drop_table('claim_status_history')
    op.drop_table('document_requests')
    op.drop_table('investigation_notes')
    op.drop_table('duplicate_matches')
    op.drop_table('risk_findings')
    op.drop_table('risk_assessments')
    op.drop_table('claim_documents')
    op.drop_table('claim_line_items')
    op.drop_index(op.f('ix_claims_invoice_number'), table_name='claims')
    op.drop_index(op.f('ix_claims_claim_reference'), table_name='claims')
    op.drop_table('claims')
    op.drop_index(op.f('ix_providers_provider_code'), table_name='providers')
    op.drop_table('providers')
    op.drop_index(op.f('ix_insurance_policies_policy_number'), table_name='insurance_policies')
    op.drop_table('insurance_policies')
    op.drop_table('patient_profiles')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
