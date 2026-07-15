-- VS07 Prompt 003 backfill for manifest participant artifacts
-- Ensures previously published manifests receive empty runtime-safe artifacts.

UPDATE workflow_manifests
SET participant_manifest_json = COALESCE(
  participant_manifest_json,
  jsonb_build_object(
    'workflowVersionId', workflow_version_id,
    'generatedAt', generated_at,
    'providerMap', '{}'::jsonb,
    'supportedParticipantTypes', '[]'::jsonb
  )
),
assignment_manifest_json = COALESCE(
  assignment_manifest_json,
  jsonb_build_object(
    'workflowVersionId', workflow_version_id,
    'generatedAt', generated_at,
    'strategies', '[]'::jsonb
  )
),
resolution_manifest_json = COALESCE(
  resolution_manifest_json,
  jsonb_build_object(
    'workflowVersionId', workflow_version_id,
    'generatedAt', generated_at,
    'assignments', '[]'::jsonb
  )
)
WHERE participant_manifest_json IS NULL
   OR assignment_manifest_json IS NULL
   OR resolution_manifest_json IS NULL;
