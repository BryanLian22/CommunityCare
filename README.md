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

## Live routes and GPS

Routes now uses Leaflet with OpenStreetMap tiles, Photon place search and FOSSGIS OSRM walking/driving directions. No API key is needed for this small-scale version. Search both locations and select results (include your city); or choose **Use my location**. Select a mode, then **Find directions**. The route summary shows estimated distance/time and selectable maneuver steps. **Start live GPS** follows your device while Routes is open; dragging the map pauses following and **Recenter** resumes it. **Re-route from GPS** explicitly recalculates from the latest position. Stop tracking or leave Routes to release the location watcher.

GPS requires permission and HTTPS on a deployed site (localhost also works). A desktop's reported location may be inaccurate. The accuracy circle and timestamp indicate the fix quality; stale fixes cannot be used for re-routing. The initial Kuala Lumpur map viewport is not the user's detected location. GPS movement, voice and background operation must be checked on a physical phone during the final testing phase.

**Open Google Maps** transfers the selected destination/mode to Google Maps for its navigation experience, including voice navigation where supported. In-app GPS is a foreground location follower with a route/instruction list: it does not announce turns, automatically advance steps, reroute automatically, operate offline or run in the background. Route times exclude current traffic. No wheelchair accessibility, working-lift or step-free assurance is inferred from walking routes.

Place queries go to Photon and route coordinates to FOSSGIS through authenticated server endpoints; tile requests go directly to OpenStreetMap. The app does not persist journey history or GPS coordinates to the account/database. Provider responses have a bounded, five-minute in-memory cache; providers may keep their own request logs. The backend limits upstream requests to one per second per running process and limits requests per account. Errors are displayed without substituting sample routes. Run one server process when using the public routing service; use a shared limiter and contracted/self-hosted services for production scale. Public mapping endpoints offer no service guarantee. Attribution remains visible on the map and in Routes.

Provider documentation and terms:
- https://routing.openstreetmap.de/about.html
- https://github.com/komoot/photon
- https://operations.osmfoundation.org/policies/tiles/
- https://project-osrm.org/docs/v5.24.0/api/

Updated files: `src/App.tsx`, `server/app.mjs`, `package.json`, `package-lock.json`, `README.md`, `CHANGES.md`, generated `dist/`.
Added files: `src/Routes.tsx`, `src/Routes.css`, `server/navigation.mjs`, `tests/navigation.test.mjs`.
When updating an existing installation, preserve your `.env` and `data/` directory. Run `npm install`, `npm run build`, then `npm start` (Windows PowerShell can use `npm.cmd`). No database migration is needed for Routes.

## Live virtual residential map and wheelchair routing

The Residential navigator appears above the real Routes map and replaces the old sample map on Home. It is a schematic, not a geographical map or a surveyed floor plan. The real street map and its Google Maps handoff remain available below it.

### Management setup
1. Open **Admin → Residential map → Lifts & landmarks**. Rename/reposition the starter landmarks to match the property and verify that its connections match the actual building. Mark each verified landmark Available; enter closure/repair notes when needed.
2. Open **Paths & accessibility**. Verify each connection physically, mark its status, and tick wheelchair suitability only after checking width, slope, surface, steps and lift access. Stairs cannot be made wheelchair-suitable.
3. Both endpoints and every connection on a route must be confirmed Available. Lift A and Lift B each connect ground to Level 1; the upper bridge links the Level 1 lobbies. The fixed starter topology must match the property before use. A different building topology needs a tailored graph; moving a visual marker alone does not change its connections.
4. Optional: add surveyed latitude/longitude to the outdoor guard house, central courtyard and garden landmarks for GPS matching. Never copy approximate coordinates from an unrelated property.

All items initially show **Not confirmed**. Nothing is seeded as a working lift. Status updates persist in SQLite (`residential_map_items`) and are audited. Confirming Available expires after 24 hours; closed/repair states remain until management changes them. The additive table is created on server startup; existing accounts, bookings and other records are preserved. Concurrent edits use revision checks.

Residents receive management updates every 10 seconds while the page is visible and on returning to the page. Routes recalculate from the same graph when a lift/path changes. The wheelchair mode excludes stairs, unsuitable connections, closures, repairs and unconfirmed status. If all safe connections are unavailable, no route is shown. Standard mode can use stairs. These schematic routes minimize the number of connections and intentionally do not claim distances or travel times. Offline/failed status refresh pauses routes rather than relying on cached availability.

Residents can tap a landmark and choose **I'm here**, or choose their position in the dropdown. The blue marker is explicitly labelled as a manual selection. **Locate near a landmark** takes one GPS reading, accepts only accuracy of 35 metres or better and a configured outdoor reference within 60 metres, and labels the result as an approximate landmark match. It never infers floors or tracks indoor movement. GPS requires HTTPS/localhost and permission. Update the selected location as you move. No resident position is stored in the database.

“Live” currently means live management-entered status, not a connection to lift controllers, IoT telemetry or indoor positioning hardware. Hardware integrations can be added later. For final acceptance, test management updates across two devices and validate the layout, accessibility and GPS references onsite.

Files added in this update: `src/ResidentialMap.tsx`, `src/ResidentialMap.css`, `server/residential.mjs`, `shared/residential-map.json`, `shared/residential-routing.mjs`, `shared/residential-routing.d.mts`, `tests/residential.test.mjs`.
Files modified: `src/App.tsx`, `src/Routes.tsx`, `src/Admin.tsx`, `server/app.mjs`, `server/db.mjs`, `README.md`, `CHANGES.md`; rebuilt `dist/`.
Focused verification: `node --test tests/residential.test.mjs`. The full testing phase remains deferred.

## Household bills and visitor parking

Home now shows an outstanding-balance card and separate electricity, water and management-fee totals near the top. **View bills** expands outstanding or all bills with due dates, overdue status and payment history. The residential navigator remains on Routes and has been removed from Home.

### Bills
- **Admin → Bills & payments** issues MYR bills to an active resident, with category, billing month, due date, amount and note/unit reference.
- Admins can record a full or partial payment already received, including a receipt/reference. This is bookkeeping, not a payment gateway. It does not connect to electricity/water providers or charge residents.
- A bill without payments may be voided with a reason; paid bills cannot be voided through this screen. Correct an unpaid erroneous bill by voiding it and issuing a replacement.
- All amounts are stored as integer sen. Overpayment and stale revisions are rejected. Residents see only their own bills. Recorded changes are audited. There are no fabricated sample charges.
- Home refreshes every 15 seconds while visible and on window focus. When a refresh fails, the page warns that displayed records may be stale.

### Visitor parking
1. On Home, expand **Visitor parking**. Enter visitor name, phone number, car plate and visit date. Choose **Generate visitor QR**.
2. A persisted pass and QR image appear. Download the QR and share it with the visitor yourself. Reopen it from **My visitor passes** later. Cancel an unused pass if plans change; its saved QR then becomes invalid at verification.
3. The QR holds a random opaque pass token in an app URL, not the visitor's personal data. Management scans it using a phone's camera, opens the app, signs in using an administrator account and selects **Verify pass**. The admin screen opens on Visitor parking when the URL contains a pass token. Alternatively paste the pass code or scanned URL into **Admin → Visitor parking**.
4. Confirm visitor identity and car plate, then select **Confirm vehicle & check in**. Use **Record exit** when they leave. The server checks the date/status again for every action. A pass is valid for one entry on its visit date in Asia/Kuala_Lumpur; future, cancelled, expired and already-used passes cannot enter. Checked-in visitors can still check out after midnight.
5. The QR is a visitor entry registration, not a reserved/assigned parking bay. Bay capacity, automatic barriers, a separate guard role, and an in-app camera scanner are not implemented. Verification is limited to existing administrator accounts. Do not share an administrator account; create individual authorized accounts using the existing admin setup.
6. For phone scans, run the app at a URL reachable by the phone. A QR generated on `localhost` points to localhost on the scanning device, so use a deployed/site address or the code-paste alternative while developing. Do not post visitor QR codes publicly. No visitor or resident personal details are returned to unauthenticated QR scans.

### Update and storage
Keep your existing `.env` and `data/` folder. Run `npm install`, `npm run build`, then `npm start` (or `npm.cmd` in PowerShell). Two additive SQLite tables, `household_bills` and `visitor_passes`, are created automatically at server startup. Existing accounts, bookings, maps and other data are preserved. The ZIP intentionally excludes runtime databases, `.env`, `.git` and `node_modules`.

Added: `src/Household.tsx`, `src/Household.css`, `server/household.mjs`, `tests/household.test.mjs`.
Modified: `src/App.tsx`, `src/Admin.tsx`, `server/app.mjs`, `server/db.mjs`, `package.json`, `package-lock.json`, `README.md`, `CHANGES.md`; rebuilt `dist/`.
Verification: `npm run build` and `node --test tests/household.test.mjs` passed. These focused checks cover ownership/admin permissions, integer balances and partial payments, stale revision rejection, QR generation, creation retries, cancellation, expiry and single-entry enforcement. Full user/phone testing remains deferred.

## Animated residential route preview

Choose **A · Your position** and **B · Destination** above the schematic, then select **Preview route**. The confirmed path has a thick green outline, animated direction marks, static arrows and numbered landmarks; unrelated paths are dimmed. **Expand** reopens the larger preview. The popup shows the selected step in amber with Previous/Next controls and numbered step buttons. Lift steps include floor changes.

The animated path is an explanatory preview, not the user's movement. Animation can be paused and is disabled when the device requests reduced motion. The dialog supports Escape, keyboard focus containment and a close button. Live status changes still recalculate routes; a closed/unknown route is replaced by an unavailable message. Route setup is now above the map so residents see how to select a journey before inspecting the drawing.

Files changed for this presentation update: `src/ResidentialMap.tsx`, `src/ResidentialMap.css`, `README.md`, `CHANGES.md`, rebuilt `dist/`. No database or routing algorithm changes. Production build passed; full device testing remains for the final phase.

### Residential location selection update
The residential map now uses manual position selection only (the dropdown or **I'm here**). The **Locate near a landmark** feature and its explanatory warning were removed. Earlier residential GPS instructions above no longer apply; existing stored reference coordinates are preserved. Real-map GPS and weather location controls are unchanged. The weather explanatory paragraph and the residential route-selection hint card were also removed as requested.

Changed source files: `src/Weather.tsx`, `src/ResidentialMap.tsx`. Documentation and production `dist/` were updated. No database changes.

## Market service carousel and requests
The green Market card now automatically slides between three service highlights every five seconds. Arrows, indicators and Pause allow manual control. Rotation pauses while hovered, keyboard-focused or the page is hidden; reduced-motion settings disable automatic rotation/transitions. Each ad opens the corresponding home-service request form. These are service highlights, not unverified discount promises.

Residents choose a service, address and future appointment time, and may add a callback phone and issue/access details. Submissions are saved in the existing `records` table, with an audit entry and an in-app notification for each active administrator. Duplicate pending/approved requests for the same resident/service/time are rejected. **My service requests** opens the existing account history.

Admins receive the notification in **Notifications**, and opening it takes them to **Home services** to review the request. The dashboard refreshes while visible every 15 seconds and on focus. Approval/rejection decisions use the existing resident notification system. Optional callback phone and issue details are visible on the admin request card. Scheduling, providers and quotations still require management confirmation; the app does not dispatch a contractor automatically. Sample price/availability labels on request cards were replaced with request/quote wording.

Added: `src/MarketAds.tsx`, `src/MarketAds.css`, `tests/market.test.mjs`.
Modified: `src/App.tsx`, `src/Admin.tsx`, `server/app.mjs`, `README.md`, `CHANGES.md`, rebuilt `dist/`. No database migration required. Build and focused Market submission/admin notification/decision checks passed. Full testing remains deferred.
