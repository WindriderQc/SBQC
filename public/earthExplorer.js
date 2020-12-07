/// <reference path="../p5.global-mode.d.ts" />

let lat = 0
let lon = 0
const api_url = 'https://api.wheretheiss.at/v1/satellites/25544';

let firstTime = true;

console.log("launching")
    // Making a map and tiles
const mymap = L.map('issMap').setView([0, 0], 1);
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tiles = L.tileLayer(tileUrl, { attribution });
tiles.addTo(mymap);
// Making a marker with a custom icon
const issIcon = L.icon({
    iconUrl: 'img/iss.png',
    iconSize: [50, 32],
    iconAnchor: [25, 16]
});

let clientMarker = L.marker([0, 0]).addTo(mymap);
let marker = L.marker([lat, lon], { icon: issIcon }).addTo(mymap);
mymap.on('zoomend', function() {
    const zoom = mymap.getZoom() + 1;
    const w = 50 * zoom;
    const h = 32 * zoom;
    issIcon.options.iconSize = [w, h];
    issIcon.options.iconAnchor = [w / 2, h / 2];
    mymap.removeLayer(marker);
    let latlng = marker.getLatLng();
    marker = L.marker([0, 0], { icon: issIcon }).addTo(mymap);
    marker.setLatLng(latlng);
});

if('geolocation' in navigator) {
    console.log('geolocation available');
    
    
    try {
    navigator.geolocation.getCurrentPosition( position => {
        console.log(position);
        /*lat = position.coords.latitude
        lon = position.coords.longitude
        document.getElementById('clat').textContent = lat.toFixed(2);
        document.getElementById('clon').textContent = lon.toFixed(2);
        //document.getElementById('calt').textContent = position.coords.altitude.toFixed(2);
                
        clientMarker.setLatLng([lat, lon])

        const url = `weather/${lat},${lon}`;
        const response = await fetch(url)
        const data = await response.json()
        console.log(data)*/
    })
} catch(err){
    console.log(err)
} 


} 
else {
    console.log('Geolocation not available. :(');
}

  


async function getISS() 
{

   const response = await fetch(api_url)
   const data = await response.json()
   const { latitude, longitude } = data
   
   marker.setLatLng([latitude, longitude])
   if (firstTime) {
       mymap.setView([latitude, longitude], 2)
       firstTime = false
   }

   document.getElementById('lat').textContent = latitude.toFixed(2)
   document.getElementById('lon').textContent = longitude.toFixed(2)
}


getISS()
setInterval(getISS, 1000)