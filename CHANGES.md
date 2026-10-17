# Version 2.9 — Live weather

Replaced sample weather with authenticated server calls to Open-Meteo for weather, forecasts, air quality and city search. Added per-account location preferences, explicit optional GPS, provider attribution, source timestamps, missing-data/error states and ten-minute refresh/cache. Added three-day and hourly outlooks. Removed fabricated thunderstorm/flood-risk figures.

Build, location persistence/isolation and normalization checks passed. Live weather, air-quality and city-search requests succeeded. Simulated-browser location selection and forecast expansion passed using a controlled response. Provider timeouts are surfaced rather than replaced with demo data. Full user and real-device GPS testing remains for the final phase.

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

## Live routes
- Replaced sample Routes screen with a professional route planner, real map, searchable places, OSRM walking/driving geometry and maneuver directions.
- Added opt-in foreground GPS following, accuracy/time status, recenter, stop and explicit recalculation from GPS.
- Added Google Maps handoff for native navigation and honest accessibility/traffic limitations.
- Added authenticated, rate-limited provider endpoints, timeout/error handling and bounded caching; enabled only the OSM tile host in production CSP and a provider-compatible referrer policy.

## Virtual residential navigator
- Added a live database-backed schematic above Routes' street map and on Home.
- Added wheelchair/standard route selection, manual current-position selection, optional GPS-to-outdoor-landmark matching and clear source labels.
- Added admin editing for landmark names/positions, GPS reference coordinates, lift/path statuses, notes and wheelchair suitability.
- Added automatic route recalculation on refreshed status, closures and unavailable lifts; stairs never enter wheelchair routes.
- Added safe unconfirmed defaults, 24-hour Available expiry, offline route suspension, optimistic concurrency and audit records.
- Verified five focused checks covering safe defaults, persistence/conflicts, alternate lift routes, unsafe/stale path exclusion and admin-only API changes. Production build passed.

## Home bills and visitor parking
- Removed Home's residential navigator; the Routes navigator remains intact.
- Added Home outstanding balance and electricity/water/management totals, bill details, overdue indicators and payment history.
- Added admin bill issuing, partial/full payment recording and unpaid-bill voiding, with audit history and stale-edit checks.
- Added resident visitor registration (name, phone, car plate, date), downloadable QR pass, pass history and cancellation.
- Added admin QR/code verification, check-in/out and cancellation, enforcing Malaysia visit dates and one-entry use.
- Added private database records, creation retry keys, validation and automatic additive table initialization.
- Production build and three focused household integration checks passed; full acceptance testing remains deferred.

## Clearer residential route presentation
- Moved start/destination selection above the schematic and added a clear route-selection hint.
- Added thicker route lines, animated directional dashes, static arrowheads, A/B markers and numbered intermediate stops.
- Added an expanded native dialog with step instructions, amber segment highlighting, lift-floor information and Previous/Next controls.
- Added pause/reduced-motion support and preserved live availability updates, route blocking and privacy of location selections.
- Production build passed. No database changes.

## Requested interface cleanup
- Removed the weather location-storage explanatory paragraph.
- Removed the choose-position/destination hint card from the residential map.
- Removed Locate near a landmark, its GPS handler and the related warning message.
- Preview route now occupies the full action row; manual position selection and route animations remain.

## Market carousel and service delivery
- Added a five-second sliding green service carousel with manual navigation, pause and reduced-motion support.
- Linked ads to the corresponding request form; added optional callback phone and issue description.
- Saved new-service notifications to active admins atomically with the request, plus audit logging and duplicate/past-slot checks.
- Admin notification opens Home services; dashboard refresh includes new requests. Existing approval/rejection notifications to residents remain active.
- Replaced sample service prices and availability with request/quote wording. Production build and focused integration check passed.

## Market auto-slide correction
- Removed hover/focus/reduced-motion timer gates that could leave the carousel stationary.
- Kept a single five-second interval with hidden-page protection and cleanup on unmount.
- Removed the pause button; retained arrows, indicators and service actions.
- Build and focused rendered-component checks passed.

## Profile and shared close controls
- Redesigned profile with account identity, grouped personal details and accessibility preferences, switch controls, activity shortcut and collapsible password form.
- Standardized close controls across panels, route previews, weather settings and facility creation.
- Preserved account persistence and password functionality. Added readable large-text/high-contrast overrides and keyboard focus states.
- Production build passed.


### Route popup screen fit
- Route preview stays within the viewport with a persistent header and Back button.
- Compact map, spacing and endpoint cards reduce scrolling on phones.
- Internal scrolling supports touch, mouse and keyboard without a visible scrollbar; long instructions remain accessible.


### Resident and administrator login portals
- Choose Resident or Administrator before signing in.
- Resident sign-in and registration use a compact phone-friendly layout with 16px inputs, generous touch targets and natural scrolling for keyboards and smaller screens.
- Administrator sign-in retains the existing layout. Change login type returns to the chooser.
- Server validates the selected portal against the stored account role before issuing a session. Registration remains resident-only; no database migration required.
- Modified: src/Session.tsx, src/account.css, server/app.mjs. Production build and focused authentication checks passed; full testing remains deferred.


### Resident phone frame and saved residence locations
- Resident login/registration uses a phone border with internal scrolling.
- Profile includes Sign out.
- Resident registration collects residence, block and floor. At sign-in these fields are optional for existing accounts; providing them adds a saved location.
- Home shows saved locations below the greeting. Add/manage supports additional blocks, floors and residences, removing old entries, duplicate prevention and a 10-location limit. These are self-reported profile details, not verified property membership or access permissions.
- Startup automatically creates resident_locations without replacing existing data. Keep your existing .env and data directory and restart the server.
- Added src/ResidenceLocations.tsx. Modified src/Session.tsx, src/App.tsx, src/account.css, src/api.ts, server/app.mjs, server/db.mjs, server/schema.sql.
- Build and focused location persistence/ownership checks passed. Full testing remains deferred.


### Consistent date and time pickers
- Shared wheel picker follows the facility booking design: green selection band, month navigation, Cancel and Confirm.
- Used for service date/time, visitor date, bill due date, billing month, booking filter and facility month navigation. Facility availability checks remain active.
- Added src/DateTimeField.tsx and src/PickerWheel.tsx; modified src/App.tsx, src/Household.tsx, src/Bookings.tsx, src/BookingPicker.tsx and src/bookings.css.
- Native date/month fields replaced. Production build passed; full interaction testing remains deferred.
