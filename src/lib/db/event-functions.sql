-- 1. Event Number Generation Function
CREATE OR REPLACE FUNCTION fn_generate_event_number(p_branch_id UUID, p_year INT)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_seq_val INT;
    v_event_num VARCHAR(50);
BEGIN
    SELECT LEFT(UPPER(name), 3) INTO v_prefix FROM branches WHERE id = p_branch_id;
    IF NOT FOUND THEN
        v_prefix := 'GEN';
    END IF;

    -- Increment/init sequence sequence
    INSERT INTO core.number_series (branch_id, document_type, next_value, fiscal_year, pattern)
    VALUES (p_branch_id, 'EVENT', 1, p_year, '{PREFIX}-EV-{YEAR}-{SEQ}')
    ON CONFLICT (branch_id, document_type, fiscal_year)
    DO UPDATE SET next_value = core.number_series.next_value + 1
    RETURNING next_value INTO v_seq_val;

    v_event_num := v_prefix || '-EV-' || p_year::TEXT || '-' || LPAD(v_seq_val::TEXT, 5, '0');
    RETURN v_event_num;
END;
$$ LANGUAGE plpgsql;

-- 2. Event Health Score Calculation
CREATE OR REPLACE FUNCTION fn_calculate_event_health(p_event_id UUID)
RETURNS INT AS $$
DECLARE
    v_health INT := 100;
    v_unresolved_tasks INT;
    v_budget NUMERIC;
    v_cost NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_unresolved_tasks 
    FROM catering_event_tasks 
    WHERE event_id = p_event_id AND status != 'COMPLETED' AND is_deleted = false;

    IF v_unresolved_tasks > 5 THEN
        v_health := v_health - 15;
    ELSIF v_unresolved_tasks > 0 THEN
        v_health := v_health - (v_unresolved_tasks * 2);
    END IF;

    SELECT budget_amount INTO v_budget FROM catering_events WHERE id = p_event_id;
    SELECT COALESCE(actual_food + actual_labor + actual_logistics, 0) INTO v_cost 
    FROM catering_event_costings WHERE event_id = p_event_id;

    IF v_cost > v_budget THEN
        v_health := v_health - 20;
    END IF;

    IF v_health < 0 THEN
        v_health := 0;
    END IF;

    RETURN v_health;
END;
$$ LANGUAGE plpgsql;

-- 3. Event Profitability Calculation
CREATE OR REPLACE FUNCTION fn_calculate_event_profitability(p_event_id UUID)
RETURNS TABLE (
    revenue NUMERIC,
    cost NUMERIC,
    net_profit NUMERIC,
    margin_pct NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.budget_amount::NUMERIC AS revenue,
        (c.actual_food + c.actual_labor + c.actual_logistics)::NUMERIC AS cost,
        (e.budget_amount - (c.actual_food + c.actual_labor + c.actual_logistics))::NUMERIC AS net_profit,
        CASE 
            WHEN e.budget_amount > 0 THEN 
                ((e.budget_amount - (c.actual_food + c.actual_labor + c.actual_logistics)) / e.budget_amount * 100)::NUMERIC
            ELSE 0::NUMERIC
        END AS margin_pct
    FROM catering_events e
    LEFT JOIN catering_event_costings c ON e.id = c.event_id
    WHERE e.id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Calendar Conflict Detection
CREATE OR REPLACE FUNCTION fn_detect_calendar_conflicts(p_hall_id UUID, p_start TIMESTAMP, p_end TIMESTAMP)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_conflict BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM catering_event_functions 
        WHERE hall_id = p_hall_id 
          AND is_deleted = false
          AND (start_at, end_at) OVERLAPS (p_start, p_end)
    ) INTO v_has_conflict;

    RETURN v_has_conflict;
END;
$$ LANGUAGE plpgsql;

-- 5. Event Status Transitions Validation
CREATE OR REPLACE FUNCTION fn_validate_status_transition(p_from_status VARCHAR, p_to_status VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_from_status = 'INQUIRY' AND p_to_status IN ('TENTATIVE', 'QUOTATION', 'NEGOTIATION') THEN
        RETURN TRUE;
    ELSIF p_from_status = 'TENTATIVE' AND p_to_status IN ('QUOTATION', 'NEGOTIATION', 'CONFIRMED') THEN
        RETURN TRUE;
    ELSIF p_from_status = 'CONFIRMED' AND p_to_status = 'PLANNING' THEN
        RETURN TRUE;
    ELSIF p_from_status = 'PLANNING' AND p_to_status = 'PRODUCTION' THEN
        RETURN TRUE;
    ELSIF p_from_status = 'PRODUCTION' AND p_to_status = 'DISPATCH' THEN
        RETURN TRUE;
    ELSIF p_from_status = 'DISPATCH' AND p_to_status = 'EXECUTION' THEN
        RETURN TRUE;
    ELSIF p_from_status = 'EXECUTION' AND p_to_status = 'SETTLEMENT' THEN
        RETURN TRUE;
    ELSIF p_from_status = 'SETTLEMENT' AND p_to_status = 'COMPLETED' THEN
        RETURN TRUE;
    ELSIF p_to_status = 'ARCHIVED' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 6. Event Statistics Refresh
CREATE OR REPLACE FUNCTION fn_refresh_event_statistics(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Refreshes analytical tables/views if materialized
    -- For standard tables, we refresh KPI logs here
    INSERT INTO reports.kpi_results (kpi_id, recorded_value, recorded_date)
    SELECT 
        kd.id,
        COUNT(ce.id),
        CURRENT_DATE
    FROM reports.kpi_definitions kd
    JOIN catering_events ce ON ce.company_id = kd.company_id
    WHERE kd.company_id = p_company_id AND kd.code = 'ACTIVE_EVENTS'
    GROUP BY kd.id;
END;
$$ LANGUAGE plpgsql;
