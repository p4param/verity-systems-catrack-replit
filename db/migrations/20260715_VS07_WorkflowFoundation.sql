-- VS07 Prompt 001 - Workflow Foundation Metadata Schema
-- Milestone aligned migration naming

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  module_id VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  code VARCHAR(150) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  version BIGINT NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, module_id, entity_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
  version_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  is_initial BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  version BIGINT NOT NULL DEFAULT 1,
  UNIQUE (workflow_definition_id, version_number)
);

CREATE TABLE IF NOT EXISTS workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_initial BOOLEAN NOT NULL DEFAULT false,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  sequence INTEGER NOT NULL DEFAULT 1,
  color VARCHAR(50),
  icon VARCHAR(100),
  metadata_json JSONB,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  source_state_code VARCHAR(100) NOT NULL,
  destination_state_code VARCHAR(100) NOT NULL,
  action_code VARCHAR(100) NOT NULL,
  condition_id UUID,
  priority INTEGER NOT NULL DEFAULT 1,
  sequence INTEGER NOT NULL DEFAULT 1,
  permission_code VARCHAR(150),
  visibility_expression_id UUID,
  enabled_expression_id UUID,
  confirmation_message TEXT,
  success_message TEXT,
  failure_message TEXT,
  audit_flag BOOLEAN NOT NULL DEFAULT true,
  rollback_flag BOOLEAN NOT NULL DEFAULT false,
  compensation_action_code VARCHAR(100),
  retry_policy_json JSONB,
  timeout_seconds INTEGER,
  parallel_mode VARCHAR(20),
  exclusive_group_code VARCHAR(100),
  async_execution BOOLEAN NOT NULL DEFAULT false,
  metadata_json JSONB,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  expression_id UUID NOT NULL,
  expected_result_type VARCHAR(20),
  sequence INTEGER NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  expression_id UUID NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  payload_json JSONB,
  sequence INTEGER NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  assignment_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255),
  expression_id UUID,
  lookup_key VARCHAR(255),
  sequence INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  assignment_id UUID NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  min_approvals INTEGER NOT NULL DEFAULT 1,
  max_approvals INTEGER
);

CREATE TABLE IF NOT EXISTS workflow_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(150) NOT NULL,
  description TEXT,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  data_type VARCHAR(30) NOT NULL,
  default_value_json JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  CHECK (data_type IN ('String', 'Number', 'Boolean', 'Date', 'JSON', 'EntityReference', 'UserReference')),
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_expressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  expression TEXT NOT NULL,
  description TEXT,
  language VARCHAR(50) NOT NULL DEFAULT 'RuntimeExpression',
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  trigger_code VARCHAR(100) NOT NULL,
  template_code VARCHAR(100) NOT NULL,
  recipient_expression_id UUID,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  trigger_state_code VARCHAR(100) NOT NULL,
  escalation_after_minutes INTEGER NOT NULL,
  escalation_action_code VARCHAR(100),
  notify_assignment_id UUID,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_sla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  code VARCHAR(100) NOT NULL,
  target_minutes INTEGER NOT NULL,
  warning_minutes INTEGER,
  escalation_id UUID,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (workflow_version_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL,
  workflow_version_id UUID NOT NULL,
  business_entity_type VARCHAR(100) NOT NULL,
  business_entity_id UUID NOT NULL,
  business_record_number VARCHAR(100),
  state_code VARCHAR(100) NOT NULL,
  variables_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_by UUID,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  version BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id),
  workflow_version_id UUID NOT NULL,
  transition_code VARCHAR(100),
  from_state_code VARCHAR(100),
  to_state_code VARCHAR(100),
  action_code VARCHAR(100),
  actor_user_id UUID,
  payload_json JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS workflow_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id),
  file_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS workflow_publish_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  manifest_id UUID NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID
);

CREATE TABLE IF NOT EXISTS workflow_validation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  is_valid BOOLEAN NOT NULL,
  errors_json JSONB,
  warnings_json JSONB,
  validated_at TIMESTAMPTZ NOT NULL,
  validated_by UUID
);

CREATE TABLE IF NOT EXISTS workflow_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  generated_at TIMESTAMPTZ NOT NULL,
  generated_by UUID,
  runtime_model_json JSONB NOT NULL,
  validation_json JSONB NOT NULL,
  participant_manifest_json JSONB,
  assignment_manifest_json JSONB,
  resolution_manifest_json JSONB,
  designer_snapshot_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_tenant_entity
  ON workflow_definitions (tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_definition_status
  ON workflow_versions (workflow_definition_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_states_version
  ON workflow_states (workflow_version_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_version
  ON workflow_transitions (workflow_version_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_business_ref
  ON workflow_instances (business_entity_type, business_entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_instance
  ON workflow_history (workflow_instance_id, occurred_at);
