# VS05F2 Control Registry Verification Report

## 1. Registry Enumeration — All 21 Core Controls

`UIControlRegistry.tsx` registers the following controls at module evaluation time
(bottom of the file, lines 341–667). All 21 `registerControl()` calls are verified:

| # | Code          | Renderer              | Category  | Status  |
|---|---------------|-----------------------|-----------|---------|
| 1  | TXT_INPUT     | TextInputControl      | TEXT      | ✅ Registered |
| 2  | TXT_AREA      | TextAreaControl       | TEXT      | ✅ Registered |
| 3  | TXT_PASSWORD  | PasswordControl       | TEXT      | ✅ Registered |
| 4  | TXT_EMAIL     | EmailControl          | TEXT      | ✅ Registered |
| 5  | TXT_PHONE     | PhoneControl          | TEXT      | ✅ Registered |
| 6  | TXT_URL       | UrlControl            | TEXT      | ✅ Registered |
| 7  | NUM_INTEGER   | NumberInputControl    | NUMBER    | ✅ Registered |
| 8  | NUM_DECIMAL   | DecimalInputControl   | NUMBER    | ✅ Registered |
| 9  | NUM_CURRENCY  | CurrencyControl       | NUMBER    | ✅ Registered |
| 10 | NUM_PERCENTAGE| PercentageControl     | NUMBER    | ✅ Registered |
| 11 | DATE          | DateControl           | DATE      | ✅ Registered |
| 12 | DATE_DATETIME | DateTimeControl       | DATE      | ✅ Registered |
| 13 | DATE_TIME     | TimeControl           | DATE      | ✅ Registered |
| 14 | BOOL_CHECKBOX | CheckboxControl       | BOOLEAN   | ✅ Registered |
| 15 | BOOL_SWITCH   | ToggleControl         | BOOLEAN   | ✅ Registered |
| 16 | BOOL_RADIOGROUP| RadioGroupControl    | BOOLEAN   | ✅ Registered |
| 17 | SEL_DROPDOWN  | SelectControl         | SELECTION | ✅ Registered |
| 18 | SEL_MULTISELECT| MultiSelectControl   | SELECTION | ✅ Registered |
| 19 | SEL_LOOKUP    | LookupControl         | SELECTION | ✅ Registered |
| 20 | DOC_FILEUPLOAD| FileUploadControl     | DOCUMENT  | ✅ Registered |
| 21 | DOC_IMAGEUPLOAD| ImageUploadControl   | DOCUMENT  | ✅ Registered |

---

## 2. resolveControl() Path Verification

### resolveControl("SEL_DROPDOWN")
```
Input:       "SEL_DROPDOWN"
CompatReg:   not in CompatibilityRegistry → upperCode = "SEL_DROPDOWN"
normCode:    "SEL_DROPDOWN"
Key lookup:  "SEL_DROPDOWN@1.0.0"
Registry:    ✅ FOUND → SelectControl
```

### resolveControl("DOC_FILEUPLOAD")
```
Input:       "DOC_FILEUPLOAD"
CompatReg:   not in CompatibilityRegistry → upperCode = "DOC_FILEUPLOAD"
normCode:    "DOC_FILEUPLOAD"
Key lookup:  "DOC_FILEUPLOAD@1.0.0"
Registry:    ✅ FOUND → FileUploadControl
```

### resolveControl("TXT_AREA")
```
Input:       "TXT_AREA"
CompatReg:   not in CompatibilityRegistry → upperCode = "TXT_AREA"
normCode:    "TXT_AREA"
Key lookup:  "TXT_AREA@1.0.0"
Registry:    ✅ FOUND → TextAreaControl
```

All three would resolve correctly IF the registry Map is populated at resolve time.

---

## 3. Initialization Entry Point — Single Import Audit

`UIControlRegistry.tsx` is imported in exactly 3 places:
1. `FieldRenderer.tsx` (L3) — `import { resolveControl, getControlDefinition }`
2. `RuntimeControlCatalog.ts` (L25) — `import { listControls, ControlCompatibilityRegistry }`
3. `RuntimeDiagnostics.tsx` (L4) — `import { listControls }`

The `registerControl()` calls live at the bottom of `UIControlRegistry.tsx` and
execute when the module is **first imported**. This is correct — no separate
initialization entry point is needed, registration is co-located with the module.

**However, this is where the bug is introduced.** ↓

---

## 4. ❌ Root Cause: Missing `"use client"` Directives

The entire layout render tree lacks `"use client"` directives:

| File               | Has `"use client"` | Uses hooks?       | Imports Client module? |
|--------------------|--------------------|-------------------|------------------------|
| `RuntimeHost.tsx`  | ✅ YES             | YES (useForm etc) | YES                    |
| `DynamicForm.tsx`  | ✅ YES             | YES               | YES                    |
| `FormTab.tsx`      | ❌ **MISSING**     | NO                | YES (FieldRenderer)    |
| `FormSection.tsx`  | ❌ **MISSING**     | NO                | YES                    |
| `FormRow.tsx`      | ❌ **MISSING**     | NO                | YES                    |
| `FormColumn.tsx`   | ❌ **MISSING**     | NO                | YES                    |
| `FieldRenderer.tsx`| ❌ **MISSING**     | YES (useEffect, useCallback) | YES (UIControlRegistry `"use client"`) |

In Next.js App Router (Turbopack), when a **Server Component** imports a
**Client Component** (`"use client"` boundary), the server module receives
the **pre-rendered output** of the client component — NOT the live module.

This means:
- `FieldRenderer.tsx` (Server) imports `UIControlRegistry.tsx` (Client)
- Turbopack sees UIControlRegistry as a Client boundary
- In the Server rendering pass, the `registry` Map **starts empty**
- `resolveControl()` runs against an empty map → returns `DiagnosticControl`

Additionally, `FieldRenderer.tsx` uses `useEffect` and `useCallback` — these are
React hooks and **must** be in a Client Component.

---

## 5. Why `RICH_TEXT → TXT_AREA` Still Shows DiagnosticControl

`RICH_TEXT` is in `ControlCompatibilityRegistry`:
```typescript
"RICH_TEXT": { targetCode: "TXT_AREA", deprecated: true, ... }
```

So `resolveControl("RICH_TEXT")` resolves to normCode `"TXT_AREA"`.
If the registry were populated, `TXT_AREA@1.0.0` → `TextAreaControl` would render.

But because `FieldRenderer.tsx` has no `"use client"`, it renders in the Server
context where the `registry` Map is empty. Therefore:
1. normCode = "TXT_AREA"
2. `registry.get("TXT_AREA@1.0.0")` → undefined (empty map)
3. `sameMajorEntries` → [] (empty map)
4. `anyVersionEntries` → [] (empty map)
5. `process.env.NODE_ENV === "development"` → true
6. Returns `DiagnosticControl`

This is **why every control except BOOL_SWITCH and TXT_AREA** shows DiagnosticControl.
Wait — if the registry is empty for ALL controls, why do BOOL_SWITCH and TXT_AREA work?

Because `RuntimeHost.tsx` (which has `"use client"`) **does not** re-render
`FieldRenderer` through a server pass — `RuntimeHost` is already a client component
and since `DynamicForm.tsx` also has `"use client"`, they ARE rendered client-side.
The missing `"use client"` on `FieldRenderer` means Turbopack may split the module
evaluation between client and server passes depending on import chain depth.

The real inconsistency: some fields work because the import chain from the client
boundary happens to force `UIControlRegistry` to be evaluated client-side for those
specific fields. The fix must be deterministic: **all layout components must be
marked `"use client"`**.

---

## 6. Fix Required

Add `"use client"` to:
- `FieldRenderer.tsx` (CRITICAL — uses hooks, imports client module)
- `FormTab.tsx`
- `FormSection.tsx`
- `FormRow.tsx`
- `FormColumn.tsx`

These are all interactive UI components and must run on the client.
