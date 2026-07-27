# Authentication, Authorization, & RBAC Specification
**Document Code:** ERP-IAM-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Chief Security Architect  

---

## 1. Authentication Architecture

The ERP employs a layered authentication model to support web, mobile, and API interfaces securely:

```
                                  ┌──────────────────────┐
                                  │   Identity Gateway   │
                                  └──────────┬───────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
     [Internal Employee]            [Client / Vendor]             [API / Service]
   - Email + Password             - Passwordless OTP            - Client ID + Secret
   - Mandatory TOTP MFA           - Magic Link / WhatsApp       - OAuth2 Client Credentials
```

### 1.1. User Authentication Channels
* **Email & Password:** Standard login for internal employees.
* **Mobile OTP / Magic Link:** Default login method for vendors and customer portal users to reduce password management overhead.
* **Multi-Factor Authentication (MFA):** TOTP (Google Authenticator, Authy) is mandatory for Administrator, Accounts, and Executive Management roles. Security keys (WebAuthn/FIDO2) are optional but supported.
* **Single Sign-On (SSO):** SAML 2.0 and OpenID Connect (OIDC) protocols are pre-integrated into the login routes. This allows enterprise clients to sign in using Google Workspace, Microsoft Entra ID (Azure AD), Okta, or Ping Identity.

### 1.2. API & Machine-to-Machine (M2M) Authentication
* **Third-Party API Access:** Authenticated via **OAuth2 Client Credentials Flow**. External integrations request short-lived access tokens by submitting a `client_id` and `client_secret`.
* **Service-to-Service Communication:** Handled via asymmetric signing keys (JWKS) or mutual TLS (mTLS) configurations, ensuring zero-trust network boundaries.

---

## 2. Session Management & Token Lifecycles

Sessions are managed using a hybrid stateless-stateful model:

```
[Login Request] ──► [Issue Access Token (Stateless JWT, 15m)]
               └───► [Issue Refresh Token (Stateful DB/Redis, 7d)]
                            │
                            ▼ Token Refresh Checks
                  [Validate Session Status & Revocation List]
```

### 2.1. Token Specifications & Expirations

| Token Type | Lifespan | Delivery Method | Storage Location | State Model |
|---|---|---|---|---|
| **Access Token** | 15 Minutes | Authorization Header (Bearer) | Client Memory (Non-persistent) | Stateless |
| **Refresh Token**| 7 Days | HTTP-Only, Secure, SameSite Cookie | Redis cache / database | Stateful |

### 2.2. Session Revocation & Device Controls
* **Session Validation:** During token refresh checks, the API queries Redis to ensure the session has not been revoked.
* **Revocation Triggers:** Sessions are immediately revoked in cases of password resets, MFA activations, manual logs, or if a security administrator forces a logout.
* **Sliding Session Window:** Active requests automatically extend the refresh token expiration date up to a maximum session limit of 30 days.

---

## 3. Password Security Standards

The system implements strict password policies and credential protections:

* **Password Hashing:** Passwords must be hashed using **Argon2id** (with parameters: `m=65536` (64MB RAM), `t=3` iterations, `p=4` parallelism), which is superior to standard bcrypt for hardware brute-force resistance.
* **Password Complexity Rules:**
  * Minimum length of 12 characters.
  * Must contain at least one uppercase letter, one lowercase letter, one number, and one special character.
  * Password checked against public data breach lists (e.g., HaveIBeenPwned API) during password creation or modification.
* **Account Lockout Policy:** Accounts are locked for 30 minutes after 5 consecutive failed login attempts.
* **Brute-Force Protection:** Rate limiting (e.g., maximum of 10 login attempts per IP address per minute) is enforced at the network gateway level.

---

## 4. Multi-Tenant User Model

To accommodate users working across multiple branches or legal entities, the IAM model decouples users from organizations:

```
                                  ┌──────────────┐
                                  │     User     │
                                  └──────┬───────┘
                                         │ 1
                                         │
                                         ▼ *
                                ┌─────────────────┐
                                │   UserRoleMap   │
                                └────────┬────────┘
                                         │ *
                    ┌────────────────────┼────────────────────┐
                    ▼ *                  ▼ *                  ▼ *
             ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
             │   Company    │     │    Branch    │     │     Role     │
             └──────────────┘     └──────────────┘     └──────────────┘
```

* **Multi-Role Scopes:** A user can have different roles depending on the branch. For example, a user can act as a **Branch Manager** at Branch A, but only have **Read-Only** access at Branch B.
* **Active Session Scope:** During login, the user selects their active company and branch. The issued JWT access token includes this scope, isolating their database queries to that specific entity.
* **Delegated/Temporary Access:** Administrators can grant users temporary access scopes (e.g., access to a branch's database for 48 hours for auditing). The access expires automatically.

---

## 5. Authorization Strategy

To combine fine-grained control with ease of management, the ERP implements a **Hybrid Authorization Model**:

```
                       ┌───────────────────────────────┐
                       │     1. Tenant Verification    │ -- Match Tenant ID
                       └───────────────┬───────────────┘
                                               ▼
                       ┌───────────────────────────────┐
                       │   2. Role check (RBAC/PBAC)   │ -- Check action permissions
                       └───────────────┬───────────────┘
                                               ▼
                       ┌───────────────────────────────┐
                       │     3. Attribute Check (ABAC) │ -- Verify branch & event boundaries
                       └───────────────────────────────┘
```

1. **Role-Based Access Control (RBAC):** Used for initial high-level route and menu filtering (e.g., rendering the "Kitchen dashboard" only if the user has a kitchen role).
2. **Permission-Based Access Control (PBAC):** Fine-grained API control. Every endpoint checks for specific action permissions (e.g., `events:invoice:approve`).
3. **Attribute-Based Access Control (ABAC) & RLS:** Restricts row-level database access based on user attributes. For example:
   * **Row-Level Constraint:** `WHERE branch_id = user.active_branch_id`
   * **Data Ownership Constraint:** A Sales Manager can only edit event records where they are marked as the account owner (`sales_manager_id = user.id`).
