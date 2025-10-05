## Quick context

This is a Node.js Express application (entry point `sbqc_serv.js`) that acts as a small IoT/web dashboard server. It integrates with:

- MongoDB (via `scripts/database.js`) — collections are loaded into `app.locals.collections` and used across routes.
- MQTT (via `scripts/mqttServer.js`) — `mqtt.initMqtt(url, handler, channels)` is called from `sbqc_serv.js`; device logic lives in `scripts/esp32.js`.
- External Data API (configured by `DATA_API_URL`) — accessed through `services/dataApiService.js` and `services/apiClient.js`.
- Socket.IO (`scripts/socket.js`) — used to emit real-time events to clients (e.g. ISS data relayed from MQTT).

Key run commands (from `package.json`):

- Start production: `node sbqc_serv.js`
- Start development with auto-reload: `npm run dev` (uses `nodemon`)

Environment variables: See `README.md` for the common ones, but the code requires at least the variables validated in `utils/envValidator.js`:

- MONGO_CLOUD
- DATA_API_URL
- SESS_NAME
- SESS_SECRET
- TOKEN_SECRET

Other envs referenced in code: `PORT`, `NODE_ENV`, `USER`, `PASS`, `MQTT_SERVER_WS`, `DATA_API_PORT`, `WEATHER_API_KEY`, `ALERT_EMAIL`.

## What an AI coding agent should know first

1. Single entrypoint and lifecycle:
   - `sbqc_serv.js` boots the Express app, initializes MQTT + esp32 handler, connects to MongoDB, loads collections into `app.locals.collections`, sets up routes, and starts the HTTP server.
   - Many modules depend on `app.locals.collections` being populated. Modifying collection access should preserve this expectation.

2. Data flow patterns:
   - External Data API is the authoritative source for registered devices, profiles and heartbeats. Calls go through `services/dataApiService.js` which caches device lists for 5 minutes.
   - MQTT messages are handled by `scripts/esp32.js`. It receives MQTT topics (e.g. `esp32/register`, `esp32/data/<id>`) and then calls `dataApiService` to persist or fetch config.
   - Socket.IO (`scripts/socket.js`) is used as a relay (e.g. `esp32.msgHandler` publishes `sbqc/iss` to `io.sockets.emit('iss', data)`). Avoid breaking this chain when changing MQTT or socket logic.

3. Error handling and conventions:
   - Routes and services use async/await and propagate errors to a centralized Express error handler defined in `sbqc_serv.js`. Use `next(err)` in routes.
   - Custom error classes live in `utils/errors.js`. Use `BadRequest` when request validation fails so the global error handler maps codes correctly.

4. Session & auth conventions:
   - Sessions are stored in MongoDB via `connect-mongodb-session` and configured in `sbqc_serv.js`. Routes check `req.session.userToken` for Data API authorization.
   - Many routes redirect to `/login` or return 401 when `req.session.userToken` is missing — preserve this flow when adding new protected endpoints.

## Project-specific patterns and examples

- Accessing DB collections: code expects `app.locals.collections.<name>` (e.g. `req.app.locals.collections.userLogs`). When adding new code that needs DB access, accept `req` and use `req.app.locals.collections` rather than creating a new DB client.

- External API fetch wrapper: use `services/apiClient.js` with `fetchJSON(url, options)` to ensure consistent error handling and logging.

- MQTT usage:
  - Initialize only once via `scripts/mqttServer.initMqtt(url, handler, channels)` — `mqttServer.getClient()` asserts initialization.
  - Topic handlers in `scripts/esp32.js` should return `true` when a message was handled, otherwise `mqttServer.consoleMsg` is used as a fallback.

- Code that relies on caching or background tasks:
  - `scripts/syncRepos.js` is invoked on startup with `setImmediate()` and runs in background — don't block startup with long-running synchronous tasks.
  - `services/dataApiService.getRegisteredDevices` uses an in-memory cache — if tests need a fresh list, call with `forceRefresh = true`.

## Developer workflows (what to run & where to look when debugging)

- Start locally:
  - Set required env vars (see `README.md` and `utils/envValidator.js`).
  - `npm install` to install dependencies.
  - `npm run dev` to run with auto-restart.

- Debugging DB issues:
  - Look at `scripts/database.js` — collections are enumerated on connect and saved into `app.locals.collections`.
  - If a collection is missing, the code often defensively creates a reference (see `isses` handling). Prefer to add similar defensive checks.

- Debugging MQTT / IoT flows:
  - Check `scripts/mqttServer.js` for connection and subscription logic.
  - Inspect `scripts/esp32.js` for message handling and relays to the Data API.
  - For integration tests, stub `mqttServer.getClient()` or mock `mqtt.connect`.

## Tests and linting

- The repository includes `mocha` and `chai` in `devDependencies` and a `test` script in `package.json` (`npm test`). There are no visible unit tests in the repo root; if adding tests, prefer targeting services (`services/`) and utils (`utils/`) which are pure functions.

## Small actionable rules for code suggestions

1. Preserve startup sequence: maintain DB connect -> loadCollections -> routes order. Avoid moving DB-dependent code before collections load.
2. Prefer `fetchJSON` from `services/apiClient.js` for external calls. If you must use `node-fetch` directly, handle non-OK responses as `fetchJSON` does.
3. Use `req.app.locals.collections` for DB access. If a route needs a collection that may not exist at startup, add a defensive fallback like `app.locals.collections.isses = db.collection('isses')` does.
4. Respect session-based auth: check `req.session.userToken` where applicable and reuse `hasSessionID` middleware pattern if adding protected pages.
5. For MQTT/topic changes, adjust `scripts/mqttServer.js` subscription list in `sbqc_serv.js` and update `scripts/esp32.js` handlers. Keep handlers idempotent and return `true` when they fully handle a message.

## Files to open first when working on a change (priority)

1. `sbqc_serv.js` — app bootstrap and integration wiring
2. `scripts/database.js` — DB connection and `app.locals.collections` behavior
3. `services/dataApiService.js` + `services/apiClient.js` — external API contract and caching
4. `scripts/mqttServer.js` + `scripts/esp32.js` — MQTT wiring and device message logic
5. `routes/*.js` — routing and usage of sessions and collections

## If anything here is unclear

Please point to the file and the behavior you want changed. I can update these instructions to include more examples (e.g., common request/response shapes) or expand debugging recipes (sample cURL commands, sample MQTT messages) if you want.
