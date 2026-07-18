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

#email service
ADM_MAIL = 
ADM_PASS =


