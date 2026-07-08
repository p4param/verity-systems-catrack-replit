-- Default Seed Data for Event Module

-- 1. Catering Event Statuses
INSERT INTO catering_event_statuses (id, tenant_id, company_id, branch_id, name, code, created_by, updated_by) VALUES
('1e57bc26-24df-41fd-8488-888888888801', '8ee8a6c8-5dc6-4113-8898-0c67f4c54093', '2444c125-9ef1-4bdf-87f5-8d5cb5b2632b', '6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c', 'Inquiry', 'INQUIRY', '3673f1d8-04ff-44e2-a05e-8557b447814b', '3673f1d8-04ff-44e2-a05e-8557b447814b'),
('1e57bc26-24df-41fd-8488-888888888802', '8ee8a6c8-5dc6-4113-8898-0c67f4c54093', '2444c125-9ef1-4bdf-87f5-8d5cb5b2632b', '6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c', 'Tentative Booking', 'TENTATIVE', '3673f1d8-04ff-44e2-a05e-8557b447814b', '3673f1d8-04ff-44e2-a05e-8557b447814b'),
('1e57bc26-24df-41fd-8488-888888888803', '8ee8a6c8-5dc6-4113-8898-0c67f4c54093', '2444c125-9ef1-4bdf-87f5-8d5cb5b2632b', '6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c', 'Confirmed', 'CONFIRMED', '3673f1d8-04ff-44e2-a05e-8557b447814b', '3673f1d8-04ff-44e2-a05e-8557b447814b')
ON CONFLICT DO NOTHING;

-- 2. Catering Event Priorities
INSERT INTO catering_event_priorities (id, tenant_id, company_id, branch_id, name, code, created_by, updated_by) VALUES
('2e57bc26-24df-41fd-8488-888888888801', '8ee8a6c8-5dc6-4113-8898-0c67f4c54093', '2444c125-9ef1-4bdf-87f5-8d5cb5b2632b', '6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c', 'Low', 'LOW', '3673f1d8-04ff-44e2-a05e-8557b447814b', '3673f1d8-04ff-44e2-a05e-8557b447814b'),
('2e57bc26-24df-41fd-8488-888888888802', '8ee8a6c8-5dc6-4113-8898-0c67f4c54093', '2444c125-9ef1-4bdf-87f5-8d5cb5b2632b', '6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c', 'Medium', 'MEDIUM', '3673f1d8-04ff-44e2-a05e-8557b447814b', '3673f1d8-04ff-44e2-a05e-8557b447814b'),
('2e57bc26-24df-41fd-8488-888888888803', '8ee8a6c8-5dc6-4113-8898-0c67f4c54093', '2444c125-9ef1-4bdf-87f5-8d5cb5b2632b', '6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c', 'High', 'HIGH', '3673f1d8-04ff-44e2-a05e-8557b447814b', '3673f1d8-04ff-44e2-a05e-8557b447814b')
ON CONFLICT DO NOTHING;

-- 3. Catering Event Types
INSERT INTO catering_event_types (id, tenant_id, company_id, branch_id, name, code, created_by, updated_by) VALUES
('3e57bc26-24df-41fd-8488-888888888801', '8ee8a6c8-5dc6-4113-8898-0c67f4c54093', '2444c125-9ef1-4bdf-87f5-8d5cb5b2632b', '6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c', 'Wedding', 'WEDDING', '3673f1d8-04ff-44e2-a05e-8557b447814b', '3673f1d8-04ff-44e2-a05e-8557b447814b'),
('3e57bc26-24df-41fd-8488-888888888802', '8ee8a6c8-5dc6-4113-8898-0c67f4c54093', '2444c125-9ef1-4bdf-87f5-8d5cb5b2632b', '6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c', 'Corporate Event', 'CORPORATE', '3673f1d8-04ff-44e2-a05e-8557b447814b', '3673f1d8-04ff-44e2-a05e-8557b447814b')
ON CONFLICT DO NOTHING;
