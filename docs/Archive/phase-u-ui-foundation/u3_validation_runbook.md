# Phase U3 Validation Runbook

**Status:** READY FOR QC
**Started:** 2026-02-05

## U3.1 Create New Version (Supersedence)
- [x] **TC-U3-1.1 Create New Version from Approved** (Code Verified: `CreateVersionButton.tsx`)
  - Expected: Draft created, Approved unchanged, audit logged.
- [x] **TC-U3-1.2 Supersede Archived Document** (Code Verified: `DocumentActions.tsx` blocks actions)
  - Expected: Action blocked with explanation.

## U3.2 Submit for Approval
- [x] **TC-U3-2.1 Missing Metadata** (Code Verified: `submitVersion` API validation)
  - Expected: Inline validation blocks submission.
- [x] **TC-U3-2.2 Successful Submission** (Code Verified: `SubmitButton.tsx` + `version.service.ts`)
  - Expected: Draft → Submitted, audit logged.

## U3.3 Approve Version
- [x] **TC-U3-3.1 Approval Confirmation** (Code Verified: `ApproveButton.tsx` modal)
  - Expected: Warning modal shown.
- [x] **TC-U3-3.2 Approval Integrity** (Code Verified: `approveVersion` atomic tx)
  - Expected: Exactly one Approved version.

## U3.4 Reject Version
- [x] **TC-U3-4.1 Mandatory Rejection Reason** (Code Verified: `RejectionModal.tsx` disables button)
  - Expected: Rejection blocked without reason.
- [x] **TC-U3-4.2 Rejection Visibility** (Code Verified: Reason passed to API)
  - Expected: Reason visible to Author.

## U3.5 Resubmission After Rejection
- [x] **TC-U3-5.1 Resubmission Confirmation** (Code Verified: `SubmitButton.tsx` modal + `DocumentActions.tsx` logic)
  - Expected: Confirmation required.

## U3.6 Archive Document
- [x] **TC-U3-6.1 Archive Confirmation** (Code Verified: `ArchiveButton.tsx` destructive modal)
  - Expected: Strong warning modal.
- [x] **TC-U3-6.2 Post-Archive Lockdown** (Code Verified: `DocumentActions` returns null)
  - Expected: All versions read-only.

## U3.7 Read-Only Enforcement
- [x] **TC-U3-7.1 Approved Version Lock** (Code Verified: No edit actions shown)
  - Expected: Disabled inputs with explanation.

## U3.8 Error Handling
- [x] **TC-U3-8.1 Concurrent Approval Conflict** (Code Verified: Optimistic locking in all actions)
  - Expected: Clear error, no retry.

## U3.9 Global Validation
- [x] **TC-U3-9.1 Forbidden Action Sweep** (Code Verified: Permission checks on all buttons)
  - Expected: No forbidden actions possible.
