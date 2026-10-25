# SBQC

## Public projects

`public/Projects` is generated from the pinned, SBQC-managed repositories in `projects.config.json`; it is not populated while the web server starts. Run `npm run projects:publish` to fetch and atomically publish those managed projects. External catalog entries are never copied into SBQC.

Project and agent-capability discovery is available at `/api/projects`. GraphysX is cataloged at `/api/projects/graphysx` and launches its independently deployed app at `https://graphysx.specialblend.ca/`. Its browser-local bridge remains available for direct and Playwright-stdio agent sessions; unauthenticated server-side mutation is not exposed.





Need an .env file in the project root with at least these fields:


MONGO_URL=mongodb+srv://user:password@clusterX-XXXX.mongodb.net/test?retryWrites=true&w=majority

DATA_API_URL = 192.168.X.X
DATA_API_PORT = 
MONGO_PORT = 27017
MQTT_PORT = 1883
 
NODE_ENV = development  #production 
PORT = 5002  

USER = 
PASS = 


SESS_NAME = 
SESS_SECRET = 
SESS_LIFETIME = 


WEATHER_API_KEY=  
GEO_API = 


TOKEN_SECRET=

# ISS tracker (/iss-detector)
# Recorded ISS positions come from DataAPI /api/v1/iss, which requires its tool key.
# Without it /api/iss answers 503 and the page draws a TLE-computed track instead.
DATAAPI_API_KEY=
# Optional override; default is CelesTrak's ISS element set on celestrak.org.
# celestrak.com serves an expired certificate. CelesTrak blocks repeated downloads.
TLE_SOURCE_URL=

#email service
ADM_MAIL = 
ADM_PASS =



## ISS observer links

A compatible client can open `/iss-detector#passages?observer=v1:12.34,-56.78`
to use a supplied observer rounded to two decimal places. The browser validates
the paired coordinates, applies them to both the globe and pass list, and removes
them from the address with `history.replaceState`. The fragment is not sent in
HTTP requests or Referer headers; the page does not persist the observer. It is
initially visible in the link and accessible to page scripts. Unsupported or
invalid values show an explicit default-location notice. The geolocation button
can replace this observer; a denied request preserves the location already used.
Only the location is handed off: times are recalculated with this page’s current
elements, window and browser time zone.
