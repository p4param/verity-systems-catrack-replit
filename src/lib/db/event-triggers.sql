-- 1. updatedAt trigger logic
CREATE OR REPLACE FUNCTION fn_trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Audit Logging trigger logic
CREATE OR REPLACE FUNCTION fn_trigger_audit_logging()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO catering_event_audit_logs (
        event_id, tenant_id, company_id, branch_id, action_type, previous_state, current_state, changed_by
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        COALESCE(NEW.company_id, OLD.company_id),
        COALESCE(NEW.branch_id, OLD.branch_id),
        TG_OP,
        row_to_json(OLD)::text,
        row_to_json(NEW)::text,
        COALESCE(NEW.updated_by, OLD.updated_by)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Soft Delete trigger logic
CREATE OR REPLACE FUNCTION fn_trigger_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
        NEW.deleted_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Version Increment trigger logic
CREATE OR REPLACE FUNCTION fn_trigger_version_increment()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Timeline Generation trigger logic
CREATE OR REPLACE FUNCTION fn_trigger_timeline_generation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
        INSERT INTO catering_event_timelines (
            event_id, tenant_id, company_id, branch_id, summary, details, created_by, updated_by
        ) VALUES (
            NEW.id, NEW.tenant_id, NEW.company_id, NEW.branch_id,
            'Status Changed',
            'Event status updated to new workflow state.',
            NEW.updated_by, NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Notification Generation trigger logic
CREATE OR REPLACE FUNCTION fn_trigger_notification_generation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status_id IS DISTINCT FROM NEW.status_id) AND NEW.status_id = 'CONFIRMED' THEN
        INSERT INTO catering_event_notifications (
            event_id, tenant_id, company_id, branch_id, user_id, title, body, created_by, updated_by
        ) VALUES (
            NEW.id, NEW.tenant_id, NEW.company_id, NEW.branch_id,
            NEW.manager_id,
            'Event Confirmed',
            'A new catering event has been confirmed and assigned to you.',
            NEW.updated_by, NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bindings to catering_events table
CREATE TRIGGER trg_events_update_timestamp
    BEFORE UPDATE ON catering_events
    FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_timestamp();

CREATE TRIGGER trg_events_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON catering_events
    FOR EACH ROW EXECUTE FUNCTION fn_trigger_audit_logging();

CREATE TRIGGER trg_events_soft_delete
    BEFORE UPDATE ON catering_events
    FOR EACH ROW EXECUTE FUNCTION fn_trigger_soft_delete();

CREATE TRIGGER trg_events_version_inc
    BEFORE UPDATE ON catering_events
    FOR EACH ROW EXECUTE FUNCTION fn_trigger_version_increment();

CREATE TRIGGER trg_events_timeline_gen
    AFTER UPDATE ON catering_events
    FOR EACH ROW EXECUTE FUNCTION fn_trigger_timeline_generation();

CREATE TRIGGER trg_events_notification_gen
    AFTER UPDATE ON catering_events
    FOR EACH ROW EXECUTE FUNCTION fn_trigger_notification_generation();
