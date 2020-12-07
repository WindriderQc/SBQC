// find if a point (x,y) is within a circle:

//si  RacineCarré de (x^2 + y^2)    <= Rayon

/*
    //  <pre><p class="card-text" id='alarmlist_id' onload=getAlarms()>---</p></pre>
    // var list = JSON.stringify( alarms, null, 4 );
    //document.getElementById('alarmlist_id').innerHTML = list
*/



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
        }

}