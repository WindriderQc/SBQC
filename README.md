# SBQC

## Public projects

`public/Projects` is generated from the pinned repositories in `projects.config.json`; it is not populated while the web server starts. Run `npm run projects:publish` to fetch, build, and atomically publish every project, or add `-- --only graphysx` for one project. Production builds the same pinned release in GitHub Actions and activates it only after the bundle reaches the server.

Project and agent-capability discovery is available at `/api/projects`. GraphysX's browser-local agent bridge is described at `/api/projects/graphysx`; remote mutation is intentionally disabled until an authenticated, session-scoped relay is deployed.





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


