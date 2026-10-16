# CommunityCare — login, database and admin dashboard

React + TypeScript frontend with a Node.js API and SQLite database. The existing five-tab resident interface is retained. Sign-up creates a resident; administrator accounts are created using a local management command.

## Updating an existing installation

Stop the app first and back up the whole old project. Extract this ZIP into a new folder, then copy your old `data` folder and optional `.env` into the new `CommunityCare` folder. If `.env` uses a custom DATABASE_PATH, preserve that database location. Run `npm.cmd ci` and `npm.cmd run dev`. Existing accounts and records remain; the contacts table is added automatically. You do not need to create another admin.

## Live weather and air quality

Open **Safety**, then choose a city under Local weather. Search for your city, press **Use Kuala Lumpur**, or explicitly choose **Use my location**. Your selected area is saved privately to your account. Approximate coordinates (rounded to two decimal places) are sent to Open-Meteo; GPS is not requested automatically. Changing location clears old weather while the new area's data loads.

The card shows current model-estimated temperature, feels-like temperature, wind, humidity, rain probability for the current forecast hour and U.S. AQI. Forecasts show three days plus twelve hourly entries in the selected location's timezone. Values are rounded for display. U.S. AQI is not Malaysia's official API index. Missing air-quality data is shown as unavailable without hiding weather.

The page refreshes every ten minutes while visible and when returning to it. The server caches each area for ten minutes and combines concurrent requests. A manual refresh may return that cached result. Conditions and air quality have their own timestamps. Failed refreshes show an error and label any previously loaded weather as Last result; no sample numbers are substituted.

Open-Meteo's public endpoints are configured for this non-commercial prototype, with no API key needed. The server needs internet access to `api.open-meteo.com`, `air-quality-api.open-meteo.com`, and `geocoding-api.open-meteo.com`. Provider outages/rate limits can temporarily affect availability. Review [Open-Meteo licensing and commercial plans](https://open-meteo.com/en/pricing) before commercial hosting. Forecast documentation: https://open-meteo.com/en/docs; air quality: https://open-meteo.com/en/docs/air-quality-api; city search: https://open-meteo.com/en/docs/geocoding-api.

The old sample thunderstorm-watch probability and flood-risk panel have been removed. Forecast conditions are not official weather warnings; official warning and flood feeds are not connected.

## Emergency assistance and SOS

Residents: open **SOS** on Home or Safety. Call the saved Guard House or Management number directly, or select the incident type and enter your block/unit/landmark. Optionally attach a one-time GPS location and callback number. **Send SOS to management** saves the alert and creates in-app notifications for active administrators. Location is requested only when you press Attach; it is sent only with the alert. There is no background location tracking.

A saved alert starts as **Awaiting acknowledgement**. Only an administrator can acknowledge it. Residents can track management updates and history, and cancel an accidental alert before acknowledgement. Once acknowledged, contact management about a false alarm. Only one active SOS per resident is permitted; repeated submissions/retries return the existing alert. GPS denial/failure can be handled by entering a location manually. If submission cannot be confirmed, refresh alerts or call directly.

Admins: use **Emergency alerts** to review active alerts, the resident/location/callback details and any attached coordinates. Acknowledge after review, enter the contacted responder's name to mark **Responding**, and finish with **Resolved** or **False alarm** and a note. Every update notifies the resident. Updates are revision-checked to protect against conflicting edits. Acknowledgement records a person reviewing the alert; it does not automatically dispatch anyone.

The emergency desk and resident SOS panel refresh every 5 seconds while visible. Admin notification/active-alert counts refresh every 15 seconds elsewhere in the dashboard. Both show the last successful check and report refresh errors. This is polling, not guaranteed immediate delivery. Admins must have the app open to see alerts. No phone push, SMS, email, alarm sound or emergency-service dispatch is connected. Direct-call links open the device's phone handler and require a configured number. Use emergency services directly for immediate danger.

New tables `emergency_alerts` and `emergency_notifications` are added automatically. Alert status, notes, location snapshot and history persist in the database and are visible only to the submitting resident and administrators. Existing data is preserved.

## Redesigned facility selector and date/time picker

The booking screen now uses searchable facility cards and category filters, with a scrollable list for larger catalogues. The reservation summary keeps the selected facility visible even when filters change.

Select the date/time card to open the wheel picker. Scroll or tap the date and available time; use month arrows or the month field for other months. Keyboard users can focus either wheel and use Up/Down, Home or End. Cancel leaves the existing selection unchanged. Confirm applies the selected date and time; availability is rechecked before submission. Only available configured slots appear in the time wheel.

### Admin facility management

Use **Admin dashboard → Manage facilities → Add facility**. Enter the name, category, description and icon, choose Open/Closed and save. New facilities are stored in SQLite and appear in the resident booking selector without rebuilding the app. New categories become filter chips automatically. The shared JSON now provides initial seed data only; use the admin dashboard for changes.

For repairs, choose **Closed for repairs / maintenance**, enter a closure notice and save. Residents can see the facility and notice but cannot book it. The server also blocks bookings and approvals while closed, including requests from stale browser tabs. Choose **Open for booking** and save when repairs finish. Closure remains in effect until an admin reopens it; there is no automatic reopening date.

Existing reservations are retained. The management form shows the count of future pending/approved reservations; review them under **Facility bookings** and cancel affected reservations with a reason as needed. Residents see the current closure notice alongside their bookings. Closing does not automatically cancel reservations or send notifications.

Admins can edit category, description, icon and open/closed state. Facility names remain fixed after creation to preserve booking links. All facilities currently use the four standard daily slots. Older databases automatically receive the facilities table and their existing facilities; saved closures are preserved on restart.

## Facility booking

Open **Book facility** on Home or Community, select Gym/Sauna/Court and a date, then choose an available time. Availability comes from the database and refreshes every 15 seconds while visible. Reserved or past slots are disabled. Times are in **Asia/Kuala_Lumpur (UTC+8)**. One reservation is allowed per facility/date/slot; simultaneous submissions are protected by the database.

Pending bookings hold their slot. Admins open **Facility bookings**, filter by facility/date/status/resident, and approve or reject requests. Approval is allowed only before the slot starts. Approved bookings can be completed after their start time or cancelled by management. A rejection/cancellation requires a note visible to the resident. Outdated admin edits are rejected; refresh to reload.

Residents see decisions, notes and dated history under **My bookings & reports** and may cancel before the booking starts. Admin cancellation or rejection releases the slot. Past booking changes require management. Existing records remain; older bookings start recording history with their next update.

This version uses four fixed slots: 9:00 AM, 10:30 AM, 2:00 PM and 4:30 PM. Facility capacity, booking durations and editable schedules are not configured here; maintenance closures are managed through Manage facilities. Booking updates appear in booking history and in the notification centre.

## In-app notifications

Residents use the bell on Home to see assistance updates and facility-booking, report and home-service decisions. Approvals, rejections, completions, resolutions and other admin status changes create a notification for the request owner. Rejection/cancellation requires a reason. Each notification links to the correct request and its history. Administrators use **Notifications** in the sidebar for new requests, cancellations and updates to any requests they submitted themselves. Badges count unread alerts. Filter All/Unread, mark one or all as read, or choose **View request** to open the linked request. Read state is stored separately for each account in SQLite.

Notifications are generated for new activity after installing this update; historical events are not backfilled. Admin notification counts refresh every 15 seconds while the page is visible, and on focus. Resident data and alerts refresh every 30 seconds while visible, and on focus. Refresh/reopen to fetch sooner. These are in-app alerts, not operating-system push, email or SMS. No alert appears outside the app.

## Request Assistance

Residents: open **Request Assistance** on Home or Community. Select a help category, enter the unit/meeting point and details, then send. **My requests** shows assignment, current status and dated progress history. Residents can cancel pending or accepted requests; once work starts, contact management.

Admins: open **Assistance requests** in the dashboard. Search by resident, location or staff and filter by status. Enter the responsible staff member's name, choose **Accepted**, and save. Later move to **In progress**, then **Completed**. Rejection/cancellation requires a reason visible to the resident. Closed requests are retained. Conflicting edits are rejected; refresh before retrying.

Assignment records a staff name, not a staff account. Residents receive in-app updates; staff alerts and automatic dispatch are not included. Resident data refreshes on window focus or every 30 seconds while visible; admins use Refresh for request data; notification counts refresh automatically.

The `assistance_requests` table is created automatically on startup. Existing home-service bookings and accessibility reports remain in their original sections.

## Contact directory

Open **Admin dashboard > Community contacts** to enter and edit the Management Office and Guard House phone numbers, names, operating hours and descriptions. Click **Save contact details** for each card. These details are saved in SQLite and shown to all signed-in residents. Phone numbers start blank because actual numbers were not provided. Call buttons appear after numbers are saved.

Residents open **Contacts** to see the shared directory and add, edit, call or remove their own private contacts. Only administrators can edit the shared directory.

## First-time setup (Windows / PowerShell)

Use Node.js 24 or newer. Your previously installed Node 24.21.0 is suitable.

1. Extract the ZIP to a NEW folder. Keep the old project as a backup.
2. Open the inner `CommunityCare` folder in VS Code. It must contain `package.json`.
3. Open Terminal > New Terminal and run:

```powershell
npm.cmd ci
npm.cmd run admin:create
```

Enter your admin name, email and a NEW password of at least 12 characters. Confirm it. Password input is hidden in an interactive terminal; type normally and press Enter. There is no default administrator password. Use a separate email from any existing resident account.

4. Start BOTH frontend and backend with one command:

```powershell
npm.cmd run dev
```

5. Open http://localhost:5173. Sign in with the admin account to see the dashboard. Use **Resident view** to open the mobile app, and **Admin dashboard** to return.
6. To test a resident account, open a private/incognito browser window, choose **Create a resident account**, and register with another email. This keeps your administrator session separate.

Use `npm` in place of `npm.cmd` on macOS/Linux. Stop servers with Ctrl+C. Keep the terminal open while using the app. The message `.env not found. Continuing without it.` is normal; default settings work without that optional file. The API uses port 3001 and Vite uses port 5173. If a port is occupied, stop the older CommunityCare server before starting this version.

## What to test

1. Register a resident and submit a facility booking, a report, and a home-service request.
2. In the administrator window, press Refresh. Review the requests and change their statuses.
3. Return to the resident window. Records refresh when the window regains focus, or every 30 seconds while visible. A browser reload also refreshes them.
4. Publish a notice in the admin dashboard. It appears in the resident Home and Notices panels.
5. Sign out and back in: records remain in the database.
6. Try a second resident account: it cannot see another resident's contacts or requests.

## Admin dashboard

- Overview: resident count, pending requests, open reports and published notices.
- Residents: search, disable and reactivate resident accounts. Disabling an account revokes its sessions. Admin accounts cannot be disabled through this screen.
- Facility bookings: search/filter and approve, complete, reject or cancel.
- Reports: pending, in progress, resolved or rejected.
- Home services: approve, complete, reject or cancel requests. Approval does not contact an external service provider.
- Notices: create, edit and delete announcements visible to signed-in residents.
- Closed requests remain in history and cannot be reopened. Residents can cancel open requests; contacts can be removed.

## Database

The server automatically creates `data/communitycare.sqlite` and all tables on first run. You do not need MySQL, SQL Server or a separate database installation.

Tables:

| Table | Purpose |
|---|---|
| users | Account name, email, password hash, role, active flag and preferences |
| sessions | Hashed session tokens and expiration times |
| records | Resident-owned bookings, reports, private contacts and service requests |
| community_contacts | Editable management and guard contact details, update time and administrator |
| notices | Administrator announcements |
| audit_log | Administrative status, account and notice changes |

Record details are JSON in `records.payload`, with validated types and dedicated booking-slot columns. Foreign keys link records to users. A unique index prevents two pending/approved bookings for the same facility/date/time. Each listed time is treated as one fixed facility slot; capacity/overlapping-duration scheduling is outside this version.

Back up the database: stop the app with Ctrl+C, then copy the whole `data` folder to a safe location. Never replace an existing `data` folder when updating the code. An optional `.env` file can set an absolute `DATABASE_PATH` outside the project folder. `.env.example` documents configuration.

This ZIP deliberately contains no accounts, credentials or runtime database. Starting creates an empty database. Old anonymous localStorage demo records are not automatically assigned to a new account; they remain in the old browser storage and are not imported.

## Accounts and passwords

- Passwords are salted and hashed with scrypt; plain passwords are not stored.
- Sessions last eight hours and use HttpOnly, SameSite=Strict cookies. Signing out deletes the server session.
- Profile settings and contacts are private to the signed-in account.
- Residents cannot assign themselves an admin role or call admin endpoints.
- Profile > Change password changes your password and signs out other sessions.
- If a password is forgotten, the system owner can run:

```powershell
npm.cmd run password:reset
```

This requires access to the server files. Email verification and email-based password reset are not connected. Admin login uses the same login form as residents.

## Build, test and run the built app

```powershell
npm.cmd test
npm.cmd run build
npm.cmd start
```

Then visit http://localhost:3001. `npm.cmd start` serves BOTH the compiled frontend and the API. Do not use Vite's standalone preview for database testing; it does not run the backend. A production build is included, and `npm.cmd run build` regenerates it.

Backend tests use an isolated temporary database and cover registration, password hashing, role restrictions, record isolation, facility conflicts, admin moderation, notices, persistence, session revocation, password changes, account activation and rate limiting.

## Deployment scope

This is a local full-stack application, not a hosted service or native Android/iOS build. For remote users you need to host the server with a persistent disk and HTTPS. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, and `APP_ORIGIN` to your exact HTTPS origin. The production server refuses startup without these settings. Terminate HTTPS at a reverse proxy; the Node server itself uses HTTP.

Single-server SQLite and in-memory rate limits suit this local prototype. Multi-server deployment, email verification, password-reset emails, automated backups and monitoring require additional deployment work. Do not expose the Vite development server as a production service.

Marketplace offers/prices and illustrated routes are still sample data. Weather uses Open-Meteo; official disaster warnings are not connected. SOS sends in-app alerts to community administrators; it does not contact emergency services. Management submissions are real database records, but no external responders or providers are dispatched.

## Main files

- `src/Session.tsx`: registration, login, session and sign-out UI.
- `src/Admin.tsx`: admin dashboard and moderation tools.
- `src/api.ts`: frontend API client and shared types.
- `src/App.tsx`: resident screens wired to database endpoints.
- `src/account.css`: login and dashboard styling.
- `server/app.mjs`: API, authentication checks, validation and static server.
- `server/schema.sql`, `server/db.mjs`: SQLite schema and initialization.
- `server/security.mjs`: password hashing and verification.
- `server/create-admin.mjs`, `server/reset-password.mjs`: local account management.
- `scripts/dev.mjs`: starts frontend and backend together.
- `tests/backend.test.mjs`: isolated integration tests.
