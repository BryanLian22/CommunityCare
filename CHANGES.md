# Version 2.5 — Facility booking redesign

Replaced facility tabs with searchable cards, category chips, a bounded scrolling list and a reservation summary. Added a rounded date/time popup inspired by the supplied reference, with date/time scroll wheels, month navigation, keyboard controls, Cancel and Confirm. The time wheel shows only available configured slots.

Added shared/facilities.json, used by the resident selector, admin facility filter and server validation. Booking availability, approval and database records remain connected. Build, API checks and simulated-browser date-picker booking submission passed. Pixel-level browser rendering was not verified.

# Version 2.4 — Live facility booking

Added database-backed slot availability, automatic refresh, past/reserved slot states, Malaysia-time scheduling and booking summaries. Removed placeholder availability claims on facility cards.

Added dedicated admin booking filters and decision forms, rejection/cancellation reasons, status history, strict status transitions, past-time validation and protection against outdated admin edits. Residents can cancel future bookings with confirmation; cancelling releases the slot. Existing records are preserved.

Production build, API checks and simulated-browser booking submission passed. Full user testing remains for the final phase. Four fixed slots and one booking per facility/slot remain the scheduling model.

# Version 2.3 — In-app assistance notifications

Added persistent, account-owned notifications with unread badges, All/Unread filters, individual/bulk read actions and links to requests. Active admins receive new-request and resident-cancellation alerts. Request owners receive assignment/status/note updates. Request changes and notification creation share a database transaction. Notification polling in the admin dashboard does not overwrite unsaved request forms.

Additive notifications table migration preserves existing records. Alerts start with new activity; no historical backfill. Phone push, email, SMS and staff-account alerts are not connected. Production build and focused API/UI checks passed; full user testing remains for the final phase.

# Version 2.2 — Request Assistance

Added assistance submission, private resident tracking, cancellation before work begins, admin assignment by staff name, search and status filters, sequential progress updates and timestamped history. All request data is stored in SQLite. Existing installations receive an additive schema migration. Revision checks prevent overwriting concurrent updates.

Build and targeted API checks completed; full user testing remains for the final phase. Staff logins, notifications and emergency dispatch are not part of this update.

# Version 2.1 — Professional contact directory

Added separate Management Office and Guard House cards with call buttons, descriptions and operating hours. Unconfigured numbers are clearly marked and cannot be called. Personal contacts now support editing as well as adding and removal.

Added admin Community contacts settings and a persistent community_contacts table. Only administrators can change shared details; personal contacts remain owner-only. Existing databases migrate automatically without overwriting configured contact details.

Validation: TypeScript and production build passed; all 10 backend tests passed, including authorization, contact updates, persistence and migration. Simulated-browser interaction checks cover personal contact editing and shared directory editing/display. Pixel-level rendering was not verified.

# Version 2.0 — Accounts, database and administration

Added resident registration, shared resident/admin login, session restoration, sign-out and password changes. Admins are created through a server-side CLI, not public registration.

Replaced anonymous browser-only records with an SQLite API for bookings, reports, contacts, home services, profile preferences and notices. Kept the existing design, map demos and five-tab resident navigation.

Added a management dashboard with overview statistics, resident activation, request filtering and status updates, and notice publishing/editing/deletion. Authorization and ownership are enforced by the server.

Added database schema, salted scrypt password hashes, expiring HttpOnly cookie sessions, same-origin write protections, request validation, throttled authentication, booking-slot constraints and administrative audit entries.

Added one-command development startup, admin/password management commands, setup documentation and backend integration tests. Anonymous demo data is not automatically imported. No external services or emergency dispatch integrations were added.

Validation: production build and TypeScript check passed; all 8 backend integration tests passed. Simulated-browser checks against the real API passed for registration, login, profile saving, admin dashboard, notice publishing, resident notice visibility and view switching. Development startup verified. Pixel-level browser rendering was not verified.
