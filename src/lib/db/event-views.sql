-- vw_EventSummary
CREATE OR REPLACE VIEW vw_EventSummary AS
SELECT 
    e.id AS event_id,
    e.event_number,
    e.name AS event_name,
    et.name AS event_type,
    es.name AS event_status,
    ep.name AS event_priority,
    e.start_date,
    e.end_date,
    e.guest_count,
    e.budget_amount,
    COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0) AS total_actual_cost,
    COALESCE(p.total_paid, 0) AS total_amount_paid
FROM catering_events e
LEFT JOIN catering_event_types et ON e.type_id = et.id
LEFT JOIN catering_event_statuses es ON e.status_id = es.id
LEFT JOIN catering_event_priorities ep ON e.priority_id = ep.id
LEFT JOIN catering_event_costings c ON e.id = c.event_id
LEFT JOIN (
    SELECT event_id, SUM(amount) AS total_paid 
    FROM catering_event_payments 
    WHERE is_deleted = false 
    GROUP BY event_id
) p ON e.id = p.event_id
WHERE e.is_deleted = false;

-- vw_EventCalendar
CREATE OR REPLACE VIEW vw_EventCalendar AS
SELECT 
    id AS calendar_entry_id,
    event_id,
    calendar_type,
    created_at AS entry_date
FROM catering_event_calendars
WHERE is_deleted = false;

-- vw_EventFinancialSummary
CREATE OR REPLACE VIEW vw_EventFinancialSummary AS
SELECT 
    e.id AS event_id,
    e.event_number,
    e.budget_amount AS revenue,
    COALESCE(c.estimated_food + c.estimated_labor + c.estimated_logistics, 0) AS total_estimated_cost,
    COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0) AS total_actual_cost,
    (e.budget_amount - COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0)) AS actual_margin
FROM catering_events e
LEFT JOIN catering_event_costings c ON e.id = c.event_id
WHERE e.is_deleted = false;

-- vw_EventDashboard
CREATE OR REPLACE VIEW vw_EventDashboard AS
SELECT 
    branch_id,
    status_id,
    COUNT(id) AS event_count,
    SUM(budget_amount) AS total_revenue
FROM catering_events
WHERE is_deleted = false
GROUP BY branch_id, status_id;

-- vw_UpcomingEvents
CREATE OR REPLACE VIEW vw_UpcomingEvents AS
SELECT 
    id AS event_id,
    event_number,
    name,
    start_date,
    guest_count
FROM catering_events
WHERE start_date > CURRENT_TIMESTAMP AND is_deleted = false;

-- vw_EventProfitability
CREATE OR REPLACE VIEW vw_EventProfitability AS
SELECT 
    e.id AS event_id,
    e.event_number,
    e.name AS event_name,
    e.budget_amount AS revenue,
    COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0) AS actual_cost,
    (e.budget_amount - COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0)) AS net_profit,
    CASE 
        WHEN e.budget_amount > 0 
        THEN ROUND(((e.budget_amount - COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0)) / e.budget_amount) * 100, 2)
        ELSE 0 
    END AS margin_percentage
FROM catering_events e
LEFT JOIN catering_event_costings c ON e.id = c.event_id
WHERE e.is_deleted = false;

-- vw_EventHealthScores
CREATE OR REPLACE VIEW vw_EventHealthScores AS
SELECT 
    event_id,
    score,
    calculated_at
FROM catering_event_health_scores
WHERE is_deleted = false;
