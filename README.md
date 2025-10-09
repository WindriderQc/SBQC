# SBQC





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


## ISS maximum line-of-sight distance (visibility horizon)

To estimate the maximum distance from which the International Space Station (ISS), orbiting at an altitude of about 408 km, can be seen from a single point on Earth we can use a simple right-triangle geometric model.

Let:
- R = Earth's radius ≈ 6,371 km
- h = ISS altitude ≈ 408 km

When the ISS is just above the horizon the line of sight from the observer, the Earth's radius, and the distance from Earth's center to the ISS form a right triangle. Using the Pythagorean theorem:

    (R + h)^2 = R^2 + d^2

Solving for the maximum line-of-sight distance d:

    d = sqrt((R + h)^2 - R^2)

Plugging the numbers gives roughly:

```python
import math
R = 6371.0  # km
h = 408.0   # km
d = math.sqrt((R + h)**2 - R**2)
print(f"Maximum line-of-sight distance: {d:.2f} km")
# -> approximately 2316.00 km
```

This is an idealized value assuming perfect visibility and no atmospheric refraction, no local obstructions, and ignoring light/contrast effects that affect actual visual detection.

Visualization note

In the 3D ISS detector sketch (`public/js/issDetector.js`) the detection region was originally shown as a semi-transparent blue cylinder. A clearer visual is to display the horizon/detection area as a flat translucent disk (a tangent-plane "visibility horizon" circle) with an outline ring — this better communicates the ground-projected detection radius and avoids the visual clutter of a long vertical cylinder. The sketch has been updated to draw that disk and ring instead of the cylinder.


