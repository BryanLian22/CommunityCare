# Version 2.8 — Emergency assistance and SOS handling

Added resident SOS submission with manual location, optional one-time GPS attachment/callback details, direct guard/management calling and persistent history. Added an admin emergency desk with acknowledgement, responder tracking, resolution/false-alarm notes, active-alert banner and in-app notifications. Both alert views poll every five seconds while visible.

Added owner isolation, one-active-alert enforcement, retry deduplication, cancellation only before acknowledgement, stale-edit guards and atomic notification creation. Clear UI wording distinguishes server receipt from human acknowledgement. Existing data is preserved through additive emergency tables.

Production build and API lifecycle/privacy/duplicate checks passed. Simulated-browser submission, admin acknowledgement and resident status display passed. Real-device GPS/calling and full user testing remain for the final phase. No external emergency dispatch or push/SMS/email service is connected.

# Version 2.7 — Notifications for every request decision

Connected facility booking, report and home-service status decisions to persistent notifications for the owning resident. Approval/rejection messages include request details and management notes. Rejection/cancellation reasons are required. Assistance alerts continue working. Notifications link to the appropriate record, preserve read state and do not repeat for unchanged statuses.

Record status, audit entry and notification creation are committed together. Added record_notifications without replacing existing assistance alerts. Only new decisions generate alerts; earlier decisions are not backfilled. Build, API checks and existing simulated-browser flows passed. Full user testing remains for the final phase.

# Version 2.6 — Admin-managed facilities

Added Manage facilities in the admin dashboard: create facilities, edit category/description/icon, close for repairs with a resident-visible notice, and reopen. The facility catalogue is stored in SQLite. Seed migration preserves existing records and admin settings. Resident search/category filters and admin booking filters use the live catalogue.

Closed facilities remain visible but cannot receive new bookings or approvals. Existing reservations are retained with closure notices and can be cancelled by management. Future active booking counts assist review. Concurrent admin edits are protected by revision checks. Facility names remain stable after creation; daily slots remain fixed.

Build, API lifecycle checks and simulated-browser admin creation passed. Full user testing remains for the final phase.

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
