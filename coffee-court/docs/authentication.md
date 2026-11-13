# Lost Origin authentication

The customer website and administrator interface have separate origins. Locally,
the website runs on `http://127.0.0.1:5173` and the admin service on
`http://127.0.0.1:5174/admin/login`. Run both from this repository with
`npm run dev:all`. Each service can also run with `dev:website` or `dev:admin`.

The admin Worker in the sibling `lost-origin-admin` repository forwards permitted
routes to this application's backend. Only the trusted server relay can request
an admin session. Every protected API also checks that session; changing a URL,
port, client role or platform identity header does not grant administrator access.
Both services use the same durable business database through the backend.

## Administrator

The login account is `admin@lostorigin.com`. The initial password was configured
in runtime secrets, never in application source. `ADMIN_PASSWORD_HASH` seeds the
account once. Subsequent changes in Settings → Security update the database,
rotate the session and revoke all existing administrator sessions. Passwords
are salted with scrypt (`N=16384, r=8, p=5`). New passwords require 12 characters.

Admin sessions expire after eight hours or one hour without activity. Persistent
session tokens are opaque random values; only their SHA-256 hashes are stored in
the database. Cookies are HttpOnly, SameSite=Strict, and use Secure and the
`__Host-` prefix on HTTPS. Mutations require the exact originating service and a
session-specific CSRF token. Failed login attempts and password changes are rate
limited in the shared database. Logout deletes the server session immediately.

## Customers and SMS delivery

SMS delivery is intentionally **not configured**, as requested. The website
offers the mobile verification form and explains that SMS is unavailable. There
is no test code, master code, password fallback or unverified login path.

An optional Twilio Verify adapter is ready in `lib/otp-provider.ts`. If that
provider is selected later, add these encrypted backend runtime secrets:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

Another provider can replace that adapter. Never enter SMS credentials in client
settings, source files or a customer form. Verification requires provider
approval, a five-minute challenge, at most five attempts and single-use challenge
consumption. Sending is limited per IP and phone with a 60-second resend delay.

Verified customer sessions persist for one year and renew on active use. Browser
cookie deletion or expiry requires signing in again. Logout revokes the session.
Customer responses include only that verified phone's history. Guest ordering
and booking remain available; guests retain their current transaction receipt.
Other bookings expose only the court, time and status needed for availability.
Inventory costs, financial records, audits and campaign registrations stay private.

## Runtime configuration

Backend configuration: `ADMIN_LOGIN_EMAIL`, `ADMIN_PASSWORD_HASH`,
`AUTH_RELAY_SECRET`, `AUTH_RATE_SECRET`, `ADMIN_ORIGIN`.

Admin service configuration: `ADMIN_ORIGIN`, `BACKEND_ORIGIN`,
`AUTH_RELAY_SECRET`, `BACKEND_SERVICE_TOKEN` (the private backend's service token).
The relay secret must match between services. The service token never reaches a
browser. The admin relay drops client-supplied role headers and forwards only its
own session cookie. Local `.dev.vars` files are ignored by Git and mode 0600.

Migration `0005_woozy_morgan_stark.sql` adds the authentication tables without
changing existing business records. Rate limits are durable and use keyed hashes
of phone numbers and IP addresses. Runtime secrets must be maintained separately
from deploy archives. Rotating the initial seed hash does not overwrite a saved
administrator password; account recovery requires an owner-controlled database
update and revocation of that account's sessions.

## Validation

`npm test` covers password hashing, provider failure and public-data filtering,
alongside the business rules. The integration scripts require an authenticated
test session (`TEST_BASE_URL`, `TEST_COOKIE`, `TEST_CSRF`) or the initial login
credential via `TEST_ADMIN_PASSWORD`. Keep credentials in the process environment
and run against a local test database. Do not run financial fixtures in production.

Implementation references: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[Cloudflare Node crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/),
[Twilio Verify](https://www.twilio.com/docs/verify/api).
