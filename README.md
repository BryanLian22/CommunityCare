# CommunityCare

Runnable React + TypeScript project adapted from your Smart Community App Figma Make export. The green mobile layout, four tabs, cards, icons and bottom sheets are retained.

## Run on Windows

1. Install Node.js 22.12 or newer (https://nodejs.org/).
2. Extract this ZIP completely.
3. Open the CommunityCare folder in Visual Studio Code (File > Open Folder). If using full Visual Studio, use File > Open > Folder and its terminal.
4. Open Terminal > New Terminal in the folder containing package.json.
5. Run:

```sh
npm ci
npm run dev
```

6. Open the localhost address printed in the terminal, usually http://localhost:5173.
7. Press Ctrl+C in the terminal to stop.

To preview on a phone on the same Wi-Fi, run `npm run dev -- --host 0.0.0.0` and use the computer's LAN address with the printed port. Your firewall must permit that connection. Location/sharing features require HTTPS or localhost; a plain HTTP LAN preview may not support them.

## Check and build

```sh
npm run typecheck
npm run build
npm run preview
```

The production build is written to `dist/`. Use a web server to serve it; do not double-click dist/index.html. A build is included for convenience.

## What works

- Navigation between Home, Community, Safety and Routes.
- Facility/date/time selection, duplicate-slot prevention, local booking history and cancellation.
- Report categories, required descriptions, local report history and draft deletion.
- Contact creation, phone validation, removal and telephone links.
- Service search and support requests.
- Profile name, larger text and higher contrast settings.
- Notices marked as read.
- One-time location sharing through the device share menu, or a copied location link; permission and failure handling included.
- Keyboard focus containment and Escape/Close controls for panels.

Data is stored in this browser's localStorage. It persists after reload, but does not sync between devices. Clearing site data removes it. Avoid entering sensitive information into a shared browser. If browser storage is unavailable, the app displays a warning.

## Demonstrations, not connected services

- SOS is explicitly a test and never sends an alert or dispatches help.
- Weather, air quality, hazard predictions, management notices, facility availability and map details are sample data.
- The route illustration does not compute directions from the entered start/end locations. Lift status and accessibility are not verified.
- Reports and bookings are local records, not submissions to management. No security review or 500-metre resident notification is implemented.
- Contacts must be supplied by you; no security phone numbers are invented.
- No authentication, database server, push notification service or admin portal is included.

## Android and iOS

This deliverable is a mobile-responsive web application, not a native APK or iOS app. It runs in a phone browser. Store distribution would require a separate native or hybrid app packaging step, platform permissions and real backend integration.

## Files

- src/App.tsx: screens, interactive flows, local persistence and accessibility controls.
- src/index.css: original Figma styling plus local forms and responsive/accessibility adjustments.
- src/main.tsx: React entry point.
- vite.config.ts: portable Vite configuration with Figma-specific runtime plugins removed.
- index.html: page title, language and viewport.
- package.json / package-lock.json: reproducible npm setup.

Google Fonts are optional network-loaded fonts; system sans-serif is used when unavailable. No API keys are needed.
