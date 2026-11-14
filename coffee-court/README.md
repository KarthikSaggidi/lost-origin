# Lost Origin website and backend

Customer website, POS, kitchen, court booking and management UI with the shared
D1 database/API. The separate admin origin lives in `../lost-origin-admin`.

Follow the [repository-root setup instructions](../README.md) to install, create
private local configuration, build, apply migrations and start all services.
The website uses port 5173, admin port 5174, and communications port 5175.

From this folder, use `npm run typecheck`, `npm test`, and `npm run build`.
The root `npm run db:migrate` applies pending local migrations safely. Local and
hosted data are separate; sample data is inserted idempotently on first use.

See [authentication](docs/authentication.md) and
[communications](docs/communications.md) for provider setup. SMTP/SMS remain
unconfigured, WhatsApp requires account linking, and payments use demo records.
No runtime secrets, local databases or browser sessions are committed.

See [POS open bills](docs/pos.md) for bill previews, independent counter
scrolling, saved drafts and billing recovery.

Integration scripts require authenticated local admin sessions and write
synthetic financial records. Follow the authentication guide before running
`test:integration`, `test:concurrency` or `test:imports`; never target production.
