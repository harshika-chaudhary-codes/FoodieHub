# FoodieHub — Backend Enabled

FoodieHub now runs as a full-stack local demo with Node.js, Express, and JSON-file storage.

## Requirements
- Node.js 20 or newer (Node.js 24 is supported)
- Internet connection for the first `npm install` (to download Express)

## Run on Windows / VS Code
1. Extract this ZIP into a new folder.
2. In VS Code, use **File → Open Folder** and select the extracted `foodiehub-upgraded` folder.
3. Choose **Terminal → New Terminal**. Confirm the terminal path is this folder (it contains `package.json` and `server.js`).
4. If `node` is not recognised in this terminal, run `$env:Path += ";C:\Program Files\nodejs"`.
5. Run `npm install` once.
6. Run `npm start` and leave the terminal open.
7. Open **http://localhost:3000** in your browser. Do not use Live Server for this backend-connected version.

## Backend endpoints
- `GET /api/health` — health check
- `GET /api/menu` — server-side menu and prices
- `GET /api/orders` — order history for this local demo
- `POST /api/orders` — validates cart items and prices on the server, calculates totals, and saves an order
- `POST /api/newsletter` — validates and saves a demo newsletter subscription

Orders are stored in `data/orders.json`; newsletter subscriptions are stored in `data/subscribers.json`. These files are created automatically if missing. JSON files are appropriate for a beginner/local demo, not for concurrent production traffic.

## Important safety / production notes
- This is a portfolio demo, not a live ordering service. Use fictional test details only.
- Checkout does not process UPI, cards, or any real payment. Newsletter sign-up does not send email.
- The demo API has no login or per-user access control; do not deploy it publicly with real customer data. A production version needs a database, authentication/authorization, HTTPS, rate limiting, privacy controls, and payment-provider integration.
- If you change files while the server is running, restart it with `Ctrl+C`, then `npm start` again.

## Troubleshooting
- `npm is not recognized`: close/reopen VS Code, or run `$env:Path += ";C:\Program Files\nodejs"` in PowerShell.
- `Cannot find module 'express'`: make sure the terminal is in the folder containing `package.json`, then run `npm install`.
- Port 3000 is busy: in PowerShell, run `$env:PORT=3001` and then `npm start`; open `http://localhost:3001`.
