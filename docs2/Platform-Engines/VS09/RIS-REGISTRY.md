# RIS Registry — VS09 Communication & Notification Engine

```
Registry Title     : Reference Implementation Specification (RIS) Registry
Engine             : VS09 – Communication & Notification Engine
Registry Status    : CERTIFIED & ACTIVE
Date               : 2026-07-22
```

---

## Registered Reference Implementation Specifications (RIS-001 through RIS-006)

### RIS-001 — Notification Template
* **Status**: 🟢 Certified
* **Version**: `v1.0.0`
* **Dependencies**: Tenant Context, ES-001, ES-008, ES-009
* **Superseded**: None
* **Referenced By**: EWP-001, EWP-002, EWP-003, EWP-004, EWP-005, EWP-006

### RIS-002 — Notification Channel
* **Status**: 🟢 Certified
* **Version**: `v1.0.0`
* **Dependencies**: RIS-001, Tenant Context
* **Superseded**: None
* **Referenced By**: EWP-002, EWP-003, EWP-005, EWP-006

### RIS-003 — Notification Delivery
* **Status**: 🟢 Certified
* **Version**: `v1.0.0`
* **Dependencies**: RIS-001, RIS-002, Tenant Context
* **Superseded**: None
* **Referenced By**: EWP-003, EWP-004, EWP-005, EWP-006

### RIS-004 — Notification Recipient
* **Status**: 🟢 Certified
* **Version**: `v1.0.0`
* **Dependencies**: RIS-003, Tenant Context
* **Superseded**: None
* **Referenced By**: EWP-004, EWP-005, EWP-006

### RIS-005 — Provider Profile
* **Status**: 🟢 Certified
* **Version**: `v1.0.0`
* **Dependencies**: RIS-002, Tenant Context
* **Superseded**: None
* **Referenced By**: EWP-005, EWP-006

### RIS-006 — Delivery Tracking
* **Status**: 🟢 Certified
* **Version**: `v1.0.0`
* **Dependencies**: RIS-003, RIS-005, Tenant Context
* **Superseded**: None
* **Referenced By**: EWP-006, Operational Observability & Analytics Read Models
