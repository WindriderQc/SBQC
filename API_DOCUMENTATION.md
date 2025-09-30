# API Call Documentation

This document outlines all external and internal API calls made within the SBQC server application. The purpose is to provide a clear overview for future standardization and performance optimization.

## Summary of Findings

The codebase contains numerous API calls to both external services (for weather, tides, geolocation, etc.) and an internal `DataAPI`. Authentication is handled via session tokens and API keys stored in environment variables. Caching is implemented for some of the more frequently called endpoints to reduce latency and API usage.

## External API Calls

### OpenWeatherMap

- **Endpoints:**
  - `https://api.openweathermap.org/data/2.5/weather`
  - `https://api.openweathermap.org/data/3.0/onecall`
  - `https://api.openweathermap.org/data/3.0/onecall/timemachine`
- **Internal Route:** `/api/weather/:latlon`, `/api/pressure`
- **Purpose:** Fetches current weather, forecast, and historical pressure/temperature data.
- **Authentication:** `WEATHER_API_KEY` environment variable.
- **Caching:** The `/api/pressure` route implements a cache for both historical and forecast data with durations of 6 hours and 1 hour, respectively.

### OpenAQ

- **Endpoint:** `https://api.openaq.org/v3/locations`, `https://api.openaq.org/v3/sensors/{id}`
- **Internal Route:** `/api/weather/:latlon`
- **Purpose:** Fetches air quality data.
- **Authentication:** `OPENAQ_API_KEY` environment variable.
- **Caching:** None.

### World Tides

- **Endpoint:** `https://www.worldtides.info/api/v3`
- **Internal Route:** `/api/tides`
- **Purpose:** Fetches tide data.
- **Authentication:** `API_TIDES_KEY` environment variable.
- **Caching:** None.

### Celestrak

- **Endpoint:** `https://celestrak.com/NORAD/elements/stations.txt`
- **Internal Route:** `/api/tle`
- **Purpose:** Fetches Two-Line Element (TLE) data for tracking satellites.
- **Authentication:** None.
- **Caching:** Caches TLE data for 2 hours.

### ip-api.com & ipify.org

- **Endpoints:**
  - `http://ip-api.com/json/{ip}`
  - `https://api64.ipify.org?format=json`
- **Internal Route:** `/api/proxy-location`
- **Purpose:** Fetches the server's public IP and then its geolocation.
- **Authentication:** None.
- **Caching:** None.

### Environment Canada (GeoMet)

- **Endpoints:**
  - `https://api.weather.gc.ca/collections/swob-realtime/items`
  - `https://dd.meteo.gc.ca/citypage_weather/xml/{PROVINCE}/{SITE_CODE}_e.xml`
  - `https://api.weather.gc.ca/collections/climate-hourly/items`
  - `https://api.weather.gc.ca/collections/aqhi-observations-realtime/items`
- **Internal Route:** `/api/ec-weather`
- **Purpose:** Fetches a comprehensive set of Canadian weather data, including current conditions, forecasts, historical data, and air quality.
- **Authentication:** None.
- **Caching:** None.

## Internal DataAPI Calls

The application makes frequent calls to an internal `DataAPI`, which appears to be the primary data store for users, devices, and sensor data (heartbeats). The base URL for this API is configured via the `DATA_API_URL` and `DATA_API_PORT` environment variables.

- **Endpoint:** `/users`, `/users/fromEmail/{email}`, `/user/:id`
- **Internal Route:** `/login/register`, `/login`, `/settings`
- **Purpose:** User registration, login, and updates.
- **Authentication:** The `/settings` route uses a session token (`auth-token`). Registration and login are public.

- **Endpoint:** `/heartbeats/senderLatest/{esp}`
- **Internal Route:** `/api/deviceLatest/:esp`
- **Purpose:** Retrieves the latest data point from a specific device.
- **Authentication:** Session token (`auth-token`).
- **Caching:** None.

- **Endpoint:** `/profile/{profileName}`
- **Internal Route:** `/api/saveProfile`
- **Purpose:** Saves a device configuration profile.
- **Authentication:** Session token (`auth-token`).
- **Caching:** None.

- **Endpoint:** `/heartbeats/data/{samplingRatio},{espID},{dateFrom}`
- **Internal Route:** `/api/data/:options`
- **Purpose:** Retrieves a dataset from a device with a specific sampling ratio and date range.
- **Authentication:** Session token (`auth-token`).
- **Caching:** None.

- **Endpoint:** `/api/v1/devices`, `/device/{id}`
- **Internal Route:** `/iot`, `/device`, `/settings` (via `esp32.js` script)
- **Purpose:** Fetches the list of registered devices and details for a single device.
- **Authentication:** None.
- **Caching:** The `getRegistered` function in `scripts/esp32.js` caches the device list for 5 minutes.

- **Endpoint:** `/api/v1/alarms`, `/alarms/{espID}`
- **Internal Route:** `/device`, `/settings`, `/alarms/setAlarm`
- **Purpose:** Fetches and sets alarms for devices.
- **Authentication:** The `/alarms/setAlarm` route uses a session token (`auth-token`).

- **Endpoint:** `/api/v1/db/collectionList`
- **Internal Route:** `/database`
- **Purpose:** Fetches the list of collections from the database.
- **Authentication:** None.

- **Endpoint:** `/heartbeats`
- **Internal Route:** (via `esp32.js` script)
- **Purpose:** Saves device heartbeat data.
- **Authentication:** None.

## Non-Functional / Incomplete Routes

- **Routes:** `/data`, `/data/iss`, `/data/quakes`
- **File:** `routes/data.routes.js`
- **Reason:** These routes depend on a `liveData` variable that is not defined anywhere in the codebase. According to user feedback, this is an incomplete feature.

## Recommendations for Optimization

1.  **DataAPI Performance:** The user noted that at least one endpoint on the `DataAPI` is hit too often. Based on the analysis, the most frequently called endpoints are likely `/heartbeats` (for saving data) and `/api/v1/devices` (for getting the device list).
    - The 5-minute cache on `getRegistered` is a good start, but if the settings or IoT pages are loaded very frequently, this could still result in many calls.
    - The `/heartbeats` endpoint is called from `esp32.js` with a 20-second throttle per device. With many devices, this could still lead to high traffic. Consider batching updates or using a WebSocket for more efficient data transfer.
2.  **External API Caching:** Several external API calls lack caching (`/api/tides`, `/api/weather`, `/api/ec-weather`). Adding a caching layer (similar to the one for `/api/pressure`) for these routes would reduce latency and reliance on third-party services.
3.  **Consolidate API Keys:** API keys are stored in separate environment variables. Consolidating them under a single configuration object might improve manageability.
4.  **Error Handling:** While some routes have error handling, it could be standardized across the application to ensure consistent responses.
5.  **Remove Dead Code:** The routes associated with the `liveData` variable in `routes/data.routes.js` should be removed to avoid confusion and potential crashes.