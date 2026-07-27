# Catrack Technical Runbook: CM-022 Localization & Internationalization Engine
**Catrack ERP Platform Component Specification (CM-022)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-022`
*   **Component Name:** Localization & Internationalization Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Multi-Language Dictionaries, Date/Time/Timezone Normalization, Currency Formatting, Regional Tax Rules, Dynamic Translation Workflows.
*   **Target Audience:** Enterprise Software Engineers, UI/UX Developers, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-022` is to implement a unified localization and internationalization (i18n) engine that coordinates dynamic translation dictionaries, date/time/timezone conversions, currency formatting, and regional configurations across all modules of the Catrack ERP platform.

### Functional Scope
*   **Multi-Language Translation:** Merging translation keys with values dynamically based on locale.
*   **Timezone Normalization:** Storing all datetime records in Coordinated Universal Time (UTC) and converting values to localized timezones for display.
*   **Currency & Number Formatting:** Formatting currencies and decimal points based on locale.
*   **Regional Tax Rules Integration:** Storing tax metadata based on localized settings.

---

## 3. Technical Architecture Expectations

The Localization Engine must conform to the following architectural design:

```
                            TRANSLATION RESOLUTION FLOW
                            
                               Translate Request (Key + Locale)
                                         |
                                         v
                            +--------------------------+
                            |    L1 Client Memory      | --(Hit)--> Return Text
                            |      (React Context)     |
                            +--------------------------+
                                         |
                                      (Miss)
                                         v
                            +--------------------------+
                            |    L2 Redis Cache        | --(Hit)--> Populate L1 & Return Text
                            +--------------------------+
                                         |
                                      (Miss)
                                         v
                            +--------------------------+
                            | Database Fetch (Prisma)  | --(Save)--> Populate L2 & L1
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     Fallback Lookup      | --(Key missing locale)--> Return Global key
                            +--------------------------+
                                         |
                                         v
                                  Returned Text
```

*   **UTC Datetime Normalization:** Datetime values must be normalized to UTC at the database layer. Client components format dates dynamically based on browser timezone settings.
*   **Standardized Formats:** Formatting numbers, decimals, and currencies must use standard libraries (e.g., `Intl.NumberFormat`, `Intl.DateTimeFormat`) rather than custom string manipulation functions.

---

## 4. Domain Model & Boundaries

The Localization Engine manages these entities:

*   **LocaleDefinition:** Stores locale parameters, currency codes, date formats, timezones, and active statuses.
*   **TranslationDictionary:** Stores key-value translation dictionaries per locale.
*   **LocaleOverride:** Stores tenant-specific or branch-specific override translation records.

---

## 5. API Contract Specifications

All endpoints under `CM-022` must reside within the versioned `/api/v1/i18n/` namespace:

### 1. Retrieve Locale Dictionaries
*   **Route:** `GET /api/v1/i18n/dictionary/:locale`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "locale": "es-ES",
        "translations": {
          "COMMON_SAVE": "Guardar",
          "COMMON_CANCEL": "Cancelar",
          "EVENT_DETAILS": "Detalles del Evento"
        }
      }
    }
    ```

### 2. Format Datetime Values
*   **Route:** `POST /api/v1/i18n/format`
*   **Request Payload:**
    ```json
    {
      "datetimeUtc": "2026-07-07T10:00:00Z",
      "targetTimezone": "Europe/Madrid",
      "formatPattern": "LONG_DATE_TIME"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "formattedValue": "7 de julio de 2026, 12:00:00"
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Managing dictionaries and updating translations requires the `TRANSLATIONS_MANAGE` permission scope. Requesting translation lookups is open to internal system actions.
*   **Tenant Isolation:** Dictionary overrides must include the `tenantId` parameter, enforcing tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **L2 Caching:** Translation dictionaries and locale configurations are cached in Redis with a Time to Live (TTL) of **24 hours**.
*   **Cache Invalidation:** Modifying a dictionary entry invalidates the cached dictionary in Redis, forcing a reload on the next request.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-022` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Datetime Normalizer ] -> [ Phase 3: Translate APIs ] -> [ Phase 4: Cache Engine ] -> [ Phase 5: Verification ]
* Create i18n tables          * Build timezone convert helpers * Implement dictionary routes  * Cache dictionaries in Redis * Write Vitest unit tests
* Run Prisma migrations        * Implement formatters helpers   * Implement format routes      * Hook invalidation triggers  * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define locale and dictionary tables in the schemas. Run migrations.
*   **Phase 2: Datetime Normalizer Implementation:** Build timezone conversion helpers and configure number formatters using standard i18n libraries.
*   **Phase 3: Translate APIs Setup:** Implement REST API paths for retrieving dictionaries and formatting dates.
*   **Phase 4: Cache Engine Integration:** Implement the Redis caching layer, configure cache invalidations, and set up client-side memory caching.
*   **Phase 5: Verification & Tests:** Write unit tests to check timezone conversion and number formatting, and write E2E tests to verify localized rendering.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The timezone converter and number formatting helpers must maintain at least **95% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot view translation dictionary overrides outside their tenant context.
# Catrack Technical Runbook & Specification (CM-022 Localization & Internationalization Engine) completed successfully.
