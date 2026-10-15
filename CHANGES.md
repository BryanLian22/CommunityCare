# Version 2.0 — Accounts, database and administration

Added resident registration, shared resident/admin login, session restoration, sign-out and password changes. Admins are created through a server-side CLI, not public registration.

Replaced anonymous browser-only records with an SQLite API for bookings, reports, contacts, home services, profile preferences and notices. Kept the existing design, map demos and five-tab resident navigation.

Added a management dashboard with overview statistics, resident activation, request filtering and status updates, and notice publishing/editing/deletion. Authorization and ownership are enforced by the server.

Added database schema, salted scrypt password hashes, expiring HttpOnly cookie sessions, same-origin write protections, request validation, throttled authentication, booking-slot constraints and administrative audit entries.

Added one-command development startup, admin/password management commands, setup documentation and backend integration tests. Anonymous demo data is not automatically imported. No external services or emergency dispatch integrations were added.

Validation: production build and TypeScript check passed; all 8 backend integration tests passed. Simulated-browser checks against the real API passed for registration, login, profile saving, admin dashboard, notice publishing, resident notice visibility and view switching. Development startup verified. Pixel-level browser rendering was not verified.
