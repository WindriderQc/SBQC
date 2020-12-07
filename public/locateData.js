
let lat, lon;

async function gotLocation(pos)
{
    let lat, lon, accuracy, weather, air
  
    lat = pos.coords.latitude
    lon = pos.coords.longitude
    accuracy = pos.coords.accuracy
    console.log('Your current position is:');
    console.log(`Latitude : ${lat}`);
    console.log(`Longitude: ${lon}`);
    console.log(`More or less ${accuracy} meters.`);

    document.getElementById('lat_id').textContent = lat.toFixed(2)
    document.getElementById('lon_id').textContent = lon.toFixed(2)
    
    try {
      const api_url = `weather/${lat},${lon}`
      const response = await fetch(api_url)
      const json = await response.json()
      console.log(json)
      weather = json.weather.currently
      air = json.air_quality.results[0].measurements[0]
      document.getElementById('summary').textContent = weather.summary
      document.getElementById('temp').textContent = weather.temperature
      document.getElementById('aq_parameter').textContent = air.parameter
      document.getElementById('aq_value').textContent = air.value
      document.getElementById('aq_units').textContent = air.unit
      document.getElementById('aq_date').textContent = air.lastUpdated
    } 
    catch (error) {
      console.error(error);
      air = { value: -1 };
      document.getElementById('aq_value').textContent = 'NO READING'
    }


    const data = { lat, lon, weather, air }

    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

    const db_response = await fetch('/api', options)
    const db_json = await db_response.json()
    console.log(db_json)
}  

function error(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`)
}

const options = {
    enableHighAccuracy: true,
   // timeout: 5000,
    maximumAge: 0
}









