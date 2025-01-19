//  Client-side Javascript tools + p5.js and data gathering 

const Tools = {
    
    sleep: (ms) =>{
            return new Promise(resolve => setTimeout(resolve, ms))
        },
   
      
    fillForm: (formId, data) => {
            const { elements } = document.getElementById(formId)

            for (const [ key, value ] of Object.entries(data) ) 
            {
                const field = elements.namedItem(key)
                field && (field.value = value)
            }
        },

    // Returns a substring between two substrings. 
    // If the beginning of end "tag" is not found, the function returns an empty string.
    giveMeTextBetween: (source,  startTag,  endTag) => {
            // Find the index of the beginning tag
            let startIndex = source.indexOf(startTag);
            // If I don't find anything
            if (startIndex == -1) {
                return "";
            }
            // Move to the end of the beginning tag
            startIndex += startTag.length();

            // Find the index of the end tag
            let endIndex = source.indexOf(endTag, startIndex);
            
            // If I don't find the end tag,
            if (endIndex == -1) {
                return "";
            }
            // Return the text in between
            return source.substring(startIndex, endIndex);
        },

    scale: (num, in_min, in_max, out_min, out_max) =>{         
            return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
        },
  
        
    randomScalingFactor: () => {
            return Math.round(Math.random() * 100)
        },


    randomData: () => {
            return [
                Math.round(Math.random() * 100),
                Math.round(Math.random() * 100),
                Math.round(Math.random() * 100),
                Math.round(Math.random() * 100)
                ]
        },


    random_hex_color_code: () => {
        let randomColor = Math.floor(Math.random()*16777215).toString(16);
        return "#" + randomColor
        },
    

    randomValue : (data) => {
            return Math.max.apply(null, data) * Math.random()
        },

  
    postData : async (url = '', data='') => {   //  Used to send command to ESP-01 from client
            let option = {
            method: 'POST',
            headers: {
                
                'Content-type': 'application/x-www-form-urlencoded',  
                'Content-length': data.length   
            },
            body : data //JSON.stringify(data)
            }
            console.log (option)
            // const response = await fetch(url, option)
            fetch(url, option)
                .then(response => response.text())
                .then(body => {
                    try {
                        return JSON.parse(body);
                    } catch {
                        throw Error(body);
                    }
                })
                .then(console.log)
                .catch(console.error)
        }, 
  
     
    formatTime : (timestamp) => {
            // Create a new JavaScript Date object based on the timestamp and retreive time value from it
            var date = new Date(timestamp);
            var hours = date.getHours();
            var minutes =  date.getMinutes();
            var seconds = date.getSeconds();

            // Will display time in 10:30:23 format
            var formattedTime = hours.toString().padStart(2, '0') + ':' +  
            minutes.toString().padStart(2, '0') + ':' +  
            seconds.toString().padStart(2, '0'); 

            return(formattedTime)
        },


    isObjEmpty: (obj) => {
            for(let i in obj) return false; 
            return true;
        },
    

    cliError: (err) => {
            console.error(`ERROR(${err.code}): ${err.message}`)
        },


    cliWarning: (warn) => {
            console.warn(`WARNING(${warn.code}): ${warn.message}`)
        },

    isGeoLocAvailable: () => {
            const yesno = ('geolocation' in navigator)
            console.log( yesno ? 'geolocation available:\n' : 'geolocation not available  :(')
            return yesno
        },
    
    geoLocate: () => {
            return new Promise((resolve, reject) => {
                /*
                maximumAge  : Is a positive long value indicating the maximum age in milliseconds of a possible cached position that is acceptable to return. If set to 0, it means that the device cannot use a cached position and must attempt to retrieve the real current position. If set to Infinity the device must return a cached position regardless of its age. Default: 0.
                timeout  : Is a positive long value representing the maximum length of time (in milliseconds) the device is allowed to take in order to return a position. The default value is Infinity, meaning that getCurrentPosition() won't return until the position is available.
                enableHighAccuracy   : Is a boolean value that indicates the application would like to receive the best possible results. If true and if the device is able to provide a more accurate position, it will do so. Note that this can result in slower response times or increased power consumption (with a GPS chip on a mobile device for example). On the other hand, if false, the device can take the liberty to save resources by responding more quickly and/or using less power. Default: false.
                */
                const options = { enableHighAccuracy: true,  maximumAge: 0  }// timeout: 5000,
                navigator.geolocation.getCurrentPosition(resolve, reject, options)
            })
        },  
        
    ipLookUp: async () => {
            try {
                //const response = await fetch('http://ip-api.com/json')
                const response = await fetch('https://apip.cc/json')
               
                const data = await response.json()
                console.log('User\'s Location Data is ', data);
               // console.log('User\'s Country', data.CountryName);
                return data
            } catch (error) {
                 console.log('Request failed.  Returned status of', error);
            }

    }, 
  

    data: {

        iss_location: async () => {
            try { 
                //let url = 'http://api.open-notify.org/iss-now.json'
                const api_url = 'https://api.wheretheiss.at/v1/satellites/25544';
                const response = await fetch(api_url)
                const data = await response.json()
    
                /*const response = await fetch('/data/iss')    //  pas besoin de passer par le serveur...   au pire passer l'info en ejs from liveData du server
                const data = await response.json()*/
                //console.log(data)
                  
                return data
            } 
            catch (e) {  console.log(e)   }
        }
        /* with P5:
            let Iss
            function getISS_location()   {
                let url = 'http://api.open-notify.org/iss-now.json'
                loadJSON(url, (data) => Iss = data )
            }
            setInterval(getISS_location, 1000)
        */

    },
    
    //  P5 libraries must be loaded in order to use these functions, usually within setup() and draw() 
    p5: {

        displayGrid: (r,l, color = 0, weight = 1) => {  //  smallest weight = 1 pixel         
            for (var x = -width/2; x < width/2; x += width / r) {
                for (var y = -height/2; y < height/2; y += height / l) {
                    stroke(color);
                    strokeWeight(weight);
                    line(x, -height/2, x, height/2);
                    line(-width /2, y, width/2, y);
                }
            }
        },

        // converts from Longitude/Latitude to Graphical x,y - Mercator      TODO:  zoom is not defined here....
        mercX : (lon) => {
            lon = radians(lon);
            var a = (256 / PI) * pow(2, zoom);
            var b = lon + PI;
            return a * b;
        },

        mercY : (lat) => {
            lat = radians(lat);
            var a = (256 / PI) * pow(2, zoom);
            var b = tan(PI / 4 + lat / 2);
            var c = PI - log(b);
            return a * c;
        },

        getMercatorCoord: (lon, lat, offsetx = 0, offsety = 0) => {   //  center offset
            let cx = Tools.p5.mercX(offsetx) 
            let cy = Tools.p5.mercY(offsety)

            let x = Tools.p5.mercX(lon) - cx; 
            let y = Tools.p5.mercY(lat) - cy; 

            return ({x,y})
        },


        getSphereCoord: (rayon, latitude, longitude ) => {
            // original version -> float theta = radians(lat) + PI/2;
            var theta = radians(latitude);// fix: no + PI/2 needed, since latitude is between -180 and 180 deg
            var phi = radians(longitude) + PI;
            // fix: in OpenGL, y & z axes are flipped from math notation of spherical coordinates
            var x = rayon * cos(theta) * cos(phi);
            var y = -rayon * sin(theta);
            var z = -rayon * cos(theta) * sin(phi);
        
            let vecCoord = createVector(x,y,z);
        
            return vecCoord
        },

          /*  this will invert colors of an image
        for(int y = 0; y < butterflyImage.height; y++){
        for(int x = 0; x < butterflyImage.width; x++){
        color in = butterflyImage.get(x, y);
        color out = color(255-red(in), 255-green(in), 255-blue(in));
        butterflyImage.set(x, y, out);
        }
        }
        */

                

        // Check if mouse is over defined rectangle
        overRect: (x, y, width, height) => {
            if ((mouseX >= x) && (mouseX <= x+width) && (mouseY >= y) && (mouseY <= y+height)) 
                return true;
            else 
                return false;
        },

        
    }

}

// find if a point (x,y) is within a circle:
//si  RacineCarré de (x^2 + y^2)    <= Rayon