# Lost Origin Coffee House

Lost Origin's customer website, administrator panel and communications service,
with the supplied menu, four pickleball courts, POS billing, kitchen operations,
inventory and accounting tools.

| Folder | Purpose | Local address |
| --- | --- | --- |
| `coffee-court` | Customer website and shared database/API | `http://127.0.0.1:5173` |
| `lost-origin-admin` | Separate administrator origin and login | `http://127.0.0.1:5174/admin/login` |
| `coffee-court/services/communications` | Nodemailer and WhatsApp QR linking | Private service on port `5175` |

The admin origin relays requests to the shared backend. Role, Origin, session and
CSRF checks protect administrator actions; separate ports alone do not grant access.

## Install and run

Requires Node.js **22.13+**, npm and an installed Chrome/Chromium for WhatsApp.
From the repository root:

```sh
npm run install:all
npm run setup:local
npm run build
npm run db:migrate
npm run dev
```

Setup asks for an initial admin password without echoing it. The login email is
`admin@lostorigin.com`. Server keys and a salted scrypt password hash go into
ignored, mode-0600 environment files. No default password or private credentials
are committed. Repeating setup preserves existing credentials.

The installer skips downloading another browser. On macOS, setup uses installed
Google Chrome. Elsewhere set `CHROME_EXECUTABLE_PATH` in the communications
service's private `.env` file. Safe configuration templates are provided.

`db:migrate` applies pending migrations to the **local** database only and can be
rerun safely. Migrations are immutable; do not regenerate them during setup.
Sample business data is inserted on first use. Build output, databases, browser
sessions, dependencies and local runtime configuration stay outside Git.

## Features

- Responsive cream/white website, editable hero images, product ingredients,
  minimal navigation, menu search and a persistent cart indicator.
- Takeaway checkout with pickup time, separate tax, closable confirmation and
  downloadable PDF bills. Counter POS billing has no pickup slot.
- Four configurable courts, live availability, conflict protection, customer
  contacts, confirmations, check-in, completion and final bills. Only admins cancel.
- Compact responsive admin login, password changes, revocable sessions, rate
  limits and persistent customer sessions. SMS login awaits provider configuration.
- Kitchen timeline, POS/website visibility controls, inventory, payment records,
  balanced journals, print/import/export tools and offline counter billing.
- Editable ribbon and popup campaigns with images and registration details.
- Nodemailer confirmation emails with PDF attachments and durable delivery jobs.
  WhatsApp QR linking, editable thank-you messages, bill sharing and order updates.
- WhatsApp campaigns with opted-in contact selection, select-all, images and
  delivery history; background scroll locks and 58/80 mm receipt previews.

## Delivery and deployment

SMTP and SMS were intentionally left unconfigured. Configure SMTP securely in the
Node service and link WhatsApp from Admin → WhatsApp by scanning its QR code.
The service keeps its account session in `.auth` and delivery jobs in `.data`.

The website/admin build to Cloudflare Worker modules and preserve their existing
Sites manifests. Communications requires a persistent Node host with Chrome and
HTTPS. A hosted Worker cannot use a laptop's loopback URL or run the WhatsApp
browser. Configure production secrets separately from source.

Payment records are currently demos. Live payment collection, SMS delivery and
fiscal invoice configuration require provider/business setup before launch.
Receipts do not imply that a payment gateway collected money.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

Tests cover business/authentication/PDF rules and the communications service's
signed requests and MIME attachments. Financial integration tests must use local
test services and synthetic records, never a production business database.

## Documentation

- [Authentication](coffee-court/docs/authentication.md)
- [Email, WhatsApp and delivery setup](coffee-court/docs/communications.md)
- [Admin service](lost-origin-admin/README.md)
- [Login background and prompts](coffee-court/docs/admin-login-background.md)
- [Original specification](coffee-court/docs/product-specification.txt)

Designed and developed by [DropXcorp Pvt Ltd](https://www.dropxcorp.in).
