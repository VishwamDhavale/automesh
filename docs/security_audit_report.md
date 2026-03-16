# Security Audit Report - Automesh

**Date**: 2026-03-16  
**Auditor**: Antigravity Security  
**Scope**: `apps/api`, `apps/dashboard`, `packages/*`, and Infrastructure.

## Executive Summary

The security audit of the `automesh` project has identified several critical and high-severity vulnerabilities that require immediate attention. The most significant issue is a wide-open authentication bypass endpoint. Additionally, the system lacks data-level authorization (IDOR) and is susceptible to Cross-Site Scripting (XSS).

---

## Findings Summary

| Severity | ID | Vulnerability Name | Status |
| :--- | :--- | :--- | :--- |
| 🔴 CRITICAL | SEC-01 | Authentication Bypass via `/api/auth/token` | Identified |
| 🟠 HIGH | SEC-02 | Insecure Direct Object Reference (IDOR) | Identified |
| 🟠 HIGH | SEC-03 | XSS in Dashboard (`dangerouslySetInnerHTML`) | Identified |
| 🟡 MEDIUM | SEC-04 | Weak/Optional Webhook Verification | Identified |
| 🟡 MEDIUM | SEC-05 | Insecure Default Secrets | Identified |
| 🔵 LOW | SEC-06 | Lack of CSRF Protection | Identified |

---

## Detailed Findings

### 🔴 SEC-01: Authentication Bypass via `/api/auth/token`
- **Location**: [apps/api/src/middleware/auth.ts:42-54](file:///home/vishwam-linux/Desktop/learning/automesh/apps/api/src/middleware/auth.ts#L42-L54)
- **Description**: The `/api/auth/token` endpoint generates a valid JWT for any provided email without requiring a password or any other form of verification.
- **Impact**: Any user can impersonate any email and gain full access to the API.
- **Recommendation**: Remove this endpoint or implement proper password-based/OAuth authentication.

### 🟠 SEC-02: Insecure Direct Object Reference (IDOR)
- **Location**: [apps/api/src/routes/workflows.ts](file:///home/vishwam-linux/Desktop/learning/automesh/apps/api/src/routes/workflows.ts) and [apps/api/src/db/schema.ts](file:///home/vishwam-linux/Desktop/learning/automesh/apps/api/src/db/schema.ts)
- **Description**: Database tables (e.g., `workflows`) lack a `userId` or `ownerId` column. API routes fetch data based on `id` from the URL without verifying that the authenticated user owns that record.
- **Impact**: Any authenticated user can view, modify, or delete any workflow or run in the system by simply knowing its ID.
- **Recommendation**: Add a `userId` column to relevant tables and filter all queries in the API routes by the `user.sub` (from JWT).

### 🟠 SEC-03: XSS in Dashboard (`dangerouslySetInnerHTML`)
- **Location**: [apps/dashboard/app/settings/page.tsx:192](file:///home/vishwam-linux/Desktop/learning/automesh/apps/dashboard/app/settings/page.tsx#L192) and [apps/dashboard/app/assistant/page.tsx:177](file:///home/vishwam-linux/Desktop/learning/automesh/apps/dashboard/app/assistant/page.tsx#L177)
- **Description**: The application uses `dangerouslySetInnerHTML` to render provider icons and AI-processed content.
- **Impact**: If a provider icon (stored in DB) or AI response (potentially influenced by external event data) contains malicious script tags, they will execute in the user's browser.
- **Recommendation**: Use a sanitization library like `DOMPurify` before rendering HTML, or use standard React components to render icons and markdown safely.

### 🟡 SEC-04: Weak/Optional Webhook Verification
- **Location**: [apps/api/src/routes/webhooks.ts:45-58](file:///home/vishwam-linux/Desktop/learning/automesh/apps/api/src/routes/webhooks.ts#L45-L58)
- **Description**: Webhook signature verification is only performed if a secret is found in the database. If no secret is configured, the request is processed without verification. Additionally, there is no check for replay attacks (e.g., checking Stripe's `v1` timestamp).
- **Impact**: Attackers can spoof webhooks for integrations that haven't had a secret correctly configured yet.
- **Recommendation**: Make webhook secrets mandatory for all integrations and implement strict timestamp verification for all providers.

### 🟡 SEC-05: Insecure Default Secrets
- **Location**: [apps/api/src/middleware/auth.ts:4](file:///home/vishwam-linux/Desktop/learning/automesh/apps/api/src/middleware/auth.ts#L4) and [docker-compose.yml:41](file:///home/vishwam-linux/Desktop/learning/automesh/docker-compose.yml#L41)
- **Description**: `JWT_SECRET` defaults to `'dev-secret-change-in-production'`.
- **Impact**: If an administrator fails to set `JWT_SECRET` in production, the application will use a known static secret, making JWTs easy to forge.
- **Recommendation**: Remove default secrets from code. Throw an error if a secret is missing in a production environment.

---

## Conclusion

The `automesh` project currently has significant security gaps that must be addressed before any production deployment. The priority should be fixing the authentication bypass (SEC-01) and implementing multi-tenant authorization (SEC-02).
