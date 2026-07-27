# UX Patterns, Interaction Standards, & Component Behavior Handbook
**Document Code:** ERP-UXH-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal UX Architect & Frontend Engineering Lead  

---

## 1. System Interaction Standards

To ensure users can perform operational tasks quickly and accurately, the system uses standardized interaction patterns:

```
[Row Hover] ──► Render Action Trigger (e.g., Edit/Delete)
[Right-Click] ─► Open Context Menu (e.g., Quick Status Change)
[Drag & Drop] ─► Roster Scheduling / Kitchen Dispatch Ordering
```

### 1.1. Interaction Rules
* **Right-Click & Context Menus:** In data tables (like active bookings or inventory lists), right-clicking must open a contextual action menu. This allows users to change statuses, assign staff, or print run-sheets directly without entering the detail view.
* **Double-Click Actions:** Restricted to opening detailed modal drawers from list views. Single clicks are reserved for row selection and check-boxes.
* **Drag-and-Drop:** Utilized on calendars, staffing rosters, and kitchen dispatch queues. The system must display clear drop-zone borders and show instant visual feedback (ghost previews) during moves.

---

## 2. Navigation & Routing Behaviors

To prevent data loss and ensure a smooth experience during navigation:

* **Unsaved Changes Guard (`Dirty Forms`):** If a user makes modifications to a form (like a quote or menu setup) and attempts to navigate away, the system must intercept the route and show a warning dialog:
  > **Unsaved Changes**  
  > You have unsaved changes on this page. Are you sure you want to leave without saving?  
  > `[Leave Page]` `[Stay & Save]`
* **Deep Linking & Persistence:** All list views must persist active search strings, selected filters, and pagination offsets in the URL query string (e.g., `/inventory/stock?search=linen&warehouse=wh-2&page=3`). This ensures copy-pasting the URL restores the exact state.
* **New Tab Support:** Standard data table links must support standard browser navigation behaviors (e.g., opening in a new tab via middle-click or `Ctrl + Click`).

---

## 3. Loading, Empty, & First-Time States

The system must remain visually clean during data loading and when no records exist:

### 3.1. Loading Patterns
* **Skeleton Screens:** Used for initial page transitions and heavy data queries (like calendar rendering or dashboard panels). Skeletons must mimic the layout structure of the loading page to reduce layout shift (CLS).
* **Optimistic UI Updates:** For simple user actions (like toggling a task, assigning a driver, or liking an event), the UI must update instantly to a successful state while the background network API call completes. If the server call fails, the UI rolls back to the previous state and displays a corrective toast notification.

### 3.2. Empty State Requirements

```
┌─────────────────────────────────────────────────────────┐
│                     (Graphic/Icon)                      │
│                  No Inquiries Active                    │
│        You don't have any client leads assigned.        │
│                                                         │
│               [+ Add New Inquiry / Lead]                │
└─────────────────────────────────────────────────────────┘
```

* **Actionable Layouts:** Empty states must not simply say "No data." They must include a clear, descriptive header, a helpful explanation, and a primary call-to-action (CTA) button to create a record or clear search filters.

---

## 4. System Feedback, Errors, & Confirmations

Errors and alerts must be clear, helpful, and suggest corrective actions:

### 4.1. Error Classification & Resolution

| Error Category | UI Presentation | Primary Correction Action |
|---|---|---|
| **Input Validation** | Red helper text inline below the invalid field. | Auto-focus first invalid input field upon submission failure. |
| **API / Server Down** | Global error boundary card or persistent toast banner. | Display "Try again" trigger button. |
| **Permission Denied** | Full-page lock screen with padlock graphic. | "Request Access" button triggers workflow request to IT Admin. |
| **Concurrency Collision** | Comparison Modal showing both states. | Allow user to choose "Overwrite with my changes" or "Keep remote changes." |

### 4.2. Confirmation Guidelines
* **Destructive Actions (Deletions):** Modals must use warning colors (red alerts) and require confirmation. For critical deletions (like deleting a locked recipe or cancelling a confirmed event), the user must type the entity name to confirm:
  > **Confirm Cancellation**  
  > Type the event name **"Smith Wedding 2026"** to confirm cancellation:  
  > `[ Input Field ]`  
  > `[ Cancel Event (Disabled until text matches) ]`
* **Workflow Toasts:** Success messages (e.g., "BEO Created Successfully") must be delivered via non-disruptive toast alerts at the bottom right. Toasts automatically dismiss after 4 seconds.
* **Save Confirmations:** Successful form saves must show an inline checkmark transition or a quick toast notification. Avoid interrupting the workflow with modal dialogs for standard saves.
