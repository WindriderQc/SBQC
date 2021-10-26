// find if a point (x,y) is within a circle:
//si  RacineCarré de (x^2 + y^2)    <= Rayon

const Tools = {

    getParamValue: (paramName) =>{
            var url = window.location.search.substring(1) //get rid of "?" in querystring
            var qArray = url.split('&') //get key-value pairs
            for (var i = 0; i < qArray.length; i++) 
            {
                var pArr = qArray[i].split('=') //split key and value
                if (pArr[0] == paramName) 
                    return pArr[1]; //return value
            }
            return ""
        },


        
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



    randomValue : (data) => {
            return Math.max.apply(null, data) * Math.random()
        },

  

    postData : async (url = '', data='') => {  
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
    
    // converts from Longitude/Latitude to Graphical x,y - Mercator
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
                const response = await fetch('http://ip-api.com/json')
                const data = await response.json()
                console.log('User\'s Location Data is ', data);
                console.log('User\'s Country', data.country);
                return data
            } catch (error) {
                 console.log('Request failed.  Returned status of', error);
            }

    }, 

    getISS: async () => {
        try { 
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
          

}


