# Lost Origin Admin

Dedicated administrator origin for Lost Origin. Login is centred at
`/admin/login`; authenticated tools are at `/admin`. The customer website lives
in the sibling `coffee-court` repository.

Run `npm run dev` for `http://127.0.0.1:5174/admin/login` while the website backend
runs on port 5173. `npm run build` emits the Worker in `dist/server/index.js`.
No dependency installation is required for this service.

Provide `ADMIN_ORIGIN`, `BACKEND_ORIGIN`, `AUTH_RELAY_SECRET` and, for a private
hosted backend, `BACKEND_SERVICE_TOKEN` as runtime configuration. Local values
belong in the ignored, permission-restricted `.dev.vars` file. Never put secrets
in the browser, source, archive or command-line arguments.

The service permits only admin pages, API routes and assets. It discards incoming
identity headers and customer cookies. Server-only credentials authenticate the
relay; the backend independently validates the user's admin session, request
origin and CSRF token. Separate ports alone do not provide authorization.

Session and SMS setup details are in `../coffee-court/docs/authentication.md`.
