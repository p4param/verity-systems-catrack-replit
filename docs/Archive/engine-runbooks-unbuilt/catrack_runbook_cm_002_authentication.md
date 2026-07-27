# Catrack Technical Runbook: CM-002 Authentication
**Catrack ERP Platform Component Specification (CM-002)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-002`
*   **Component Name:** Authentication Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Credential Verification, Stateless JWT Management, Refresh Token Rotation, Multi-Factor Authentication (MFA), Single Sign-On (SSO) readiness.
*   **Target Audience:** Enterprise Software Engineers, Security Administrators, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-002` is to implement a secure, stateless authentication engine that handles identity verification, session management, and access controls for all domains of the Catrack ERP platform.

### Functional Scope
*   **Credential Verification:** Secure password hashing (bcrypt) and validation checks.
*   **Stateless Session Control:** Issuing and verifying access tokens (JWT) and refresh tokens.
*   **MFA (Multi-Factor Authentication):** RFC 6238-compliant TOTP enrollment and validation.
*   **SSO Integration (SSO-Ready):** Design patterns to support future SAML 2.0 / OpenID Connect (OIDC) integrations.
*   **Session Revocation:** Session invalidation across multiple devices and browsers.

---

## 3. Technical Architecture Expectations

The Authentication Engine must conform to the following architectural design:

```
                            SESSION REGISTRATION & JWT FLOW
                            
                                Client Credentials
                                         |
                                         v
                            +--------------------------+
                            |    Credential Check      | --(Invalid)--> Return 401 Unauthorized
                            |      (bcrypt verification) |
                            +--------------------------+
                                         |
                                      (Valid)
                                         v
                            +--------------------------+
                            |    MFA Status Check      | --(Enrolled)--> Request TOTP Token
                            +--------------------------+
                                         |
                                   (No MFA/Passed)
                                         v
                            +--------------------------+
                            |   Token Issuer (JWT)     |
                            | (Access + Refresh Token) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Cookie / DB Storage    |
                            | (Secure HTTPOnly Cookie) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     Cache Registry       |
                            |   (Redis Session Set)    |
                            +--------------------------+
```

*   **Stateless JWT Design:** Sessions are stateless. The JWT contains basic user details, the active tenant ID, and user permissions to enable fast server-side checks.
*   **Token Storage Guidelines:**
    *   *Access Token:* Stored in client memory or in a short-lived cookie.
    *   *Refresh Token:* Stored in a secure, `HttpOnly`, `Secure`, and `SameSite=Strict` cookie.
*   **Refresh Token Rotation (RTR):** Every time a refresh token is used to issue a new access token, the active refresh token is invalidated, and a new refresh token is issued to prevent session reuse attacks.

---

## 4. Domain Model & Boundaries

The Authentication Engine manages these entities:

*   **User:** Stores user email, hashed password, active status, and tenant mapping.
*   **UserRole:** Maps users to authorization roles.
*   **RefreshToken:** Stores active session hashes, expiration limits, device fingerprints, and revocation states.
*   **MfaBackupCode:** Stores backup codes to restore access if a user loses their authenticator device.

---

## 5. API Contract Specifications

All endpoints under `CM-002` must reside within the versioned `/api/v1/auth/` namespace:

### 1. Authenticate Credentials
*   **Route:** `POST /api/v1/auth/login`
*   **Payload:**
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123"
    }
    ```
*   **Success Response (200 OK - MFA Enrolled):**
    ```json
    {
      "success": true,
      "data": {
        "mfaRequired": true,
        "tempToken": "temp-verification-jwt-token"
      }
    }
    ```
*   **Success Response (200 OK - Logged In):**
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "user-uuid",
          "fullName": "John Doe",
          "email": "user@example.com",
          "tenantId": "tenant-uuid"
        },
        "accessToken": "ey...",
        "expiresIn": 900
      }
    }
    ```

### 2. Verify MFA Code
*   **Route:** `POST /api/v1/auth/mfa/verify`
*   **Headers:** `Authorization: Bearer <tempToken>`
*   **Payload:**
    ```json
    {
      "code": "123456"
    }
    ```
*   **Error Response (401 Unauthorized - Invalid MFA Code):**
    ```json
    {
      "success": false,
      "error": {
        "code": "ERR_MFA_INVALID",
        "message": "The verification code is incorrect or has expired."
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Least Privilege:** Unauthenticated users can only access endpoints under the `/api/v1/auth/login`, `/register`, and `/password-reset` paths.
*   **Rate Limiting:** Protect authentication endpoints from brute-force login attempts:
    *   Limit requests to a maximum of 5 attempts per IP address per minute on login paths.
    *   Temporarily lock accounts for 15 minutes after 5 consecutive failed login attempts.
*   **Password Complexity:** Enforce strict password rules:
    *   Minimum length of 12 characters.
    *   Must contain uppercase letters, lowercase letters, numbers, and special characters.

---

## 7. Caching & Performance Guidelines

*   **Session Validation (L2):** Blacklisted refresh tokens and active user session states are cached in Redis for fast verification during API checks.
*   **Login Speed Performance:** Speed up login requests by using optimized password hashing configurations (e.g., matching bcrypt work factors to target server processing limits).

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-002` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Session Logic ] -> [ Phase 3: API Integration ] -> [ Phase 4: MFA TOTP Setup ] -> [ Phase 5: Verification ]
* Create User schemas          * Build JWT helpers           * Build login routes          * Implement RFC 6238 TOTP    * Write Vitest unit tests
* Run Prisma migrations        * Implement token rotation   * Build token refresh routes  * Add backup code generation * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Add user credentials, refresh tokens, and backup code entities to the database schemas. Run migrations.
*   **Phase 2: Session Logic Implementation:** Build the JWT helper service to sign and verify access tokens, and implement the refresh token rotation logic.
*   **Phase 3: API Integration:** Implement REST API routes for user login, token refresh, and logout operations.
*   **Phase 4: MFA TOTP Setup:** Implement MFA enrollment, verification pipelines, and backup code generation.
*   **Phase 5: Verification & Tests:** Write unit tests to check password hashing and JWT helpers, and write E2E tests to verify login paths.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Authentication helpers and token rotation services must maintain at least **95% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verify that tokens are invalidated on logout and account lockouts trigger correctly after failed attempts.
