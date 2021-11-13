// Earth Explorer


/*
// Latitude and longitude are expected to be in radians!
float xPos = (_radius) * Mathf.Cos(latitude) * Mathf.Cos(longitude);
float zPos = (_radius) * Mathf.Cos(latitude) * Mathf.Sin(longitude);
float yPos = (_radius) * Mathf.Sin(latitude);
*/



// Quebec :  52.9399° N, 73.5491° W
// Top 100 Canadian municipalities by 2011 population
// https://github.com/dariusk/corpora/blob/master/data/geography/canadian_municipalities.json


var mapimg;
var mapStyle = 'mapbox/dark-v9';   //  mapbox/dark-v9   //  'windrider/cjs5io5kz1mvq1fqjb1x3e0ta'

var ww = 1200;
var hh = 800;

var cx, cy;
var zoom = 1; //  used in gathering Map and Coordinates system conversion

var api = '//api.openweathermap.org/data/2.5/weather?q=';
var inputCity;
var appid = '&APPID=' + '3acd322267c6cf3b8b697d7a4e9f78cb';  // Personal API key   //  TODO  :  provide key through session or get data from server api
var units = '&units=metric';
  /*
  var op = 'WND';  // Weather map layer
  var x = 0;  // Number of x tile coordinate
  var y = 0; // Number of y tile coordinate
  var date = 1527811099;
  var arrowSteps = 16; // 16
  //weather = loadStrings('http://maps.openweathermap.org/maps/2.0/weather/' + op + '/' + zoom + '/' + x + '/' + y + '?date=' + date + '&use_norm=true&arrow_step=' + arrowSteps + '&appid=' + appid);
  */


var pTemp;
var pHumid;
var earthquakes; // preloaded
var weather;  // actualized
let cityColor = 'blue'

var Iss;
var CityX = 0.0000;
var CityY = 0.0000;



function preload() 
{
  //mapimg = loadImage('https://api.mapbox.com/styles/v1/' + mapStyle + '/static/' +                
  //                   clon + ',' + clat + ',' + zoom + '/' +  ww + 'x' + hh + '?access_token=pk.eyJ1Ijoid2luZHJpZGVyIiwiYSI6ImNqczVldmR3bzBmMWU0NHRmbjlta2Y0aDEifQ.FWOdvqw-IBlcJrBKKML7iQ', printMap);
  // mapimg.save('darkmap1200x800', 'png');   //  save image from API
  mapimg = loadImage('img/darkmap1200x800.png')
  earthquakes = loadStrings('data/quakes.csv')   
  //loadFont('Montserrat-Regular.otf',  drawText);
}



function drawText(font) 
{
  //fill('#ED225D');
  textSize(18);
 // textFont(font, 36);  
  stroke('#ff9d00'); 
  fill('#ff9d00');
  let s = 'Earthquakes in last month'
  text(s, -width/2 + 10, -height/2 + 20);
  stroke(0, 255, 0);
  fill(0, 255, 0, 255);
  s = 'International Space Station'
  text(s, -width/2 +10, -height/2 + 40);  
  console.log('Legend printed.')
}


  /*catchRainbow()
    .then(response => {
      console.log('got it')
    })
    .catch(error => {
      console.log('error!'); 
      console.log(error)
    })

async function catchRainbow() {
  const response =  await fetch('/img/screenShotLevel1.png')
  const blob = await response.blob()
  document.getElementById('rainbow').src = URL.createObjectURL(blob)
}

*/
function displayEarthquakes()   //  TODO:  faire une generic method pour utiliser avec d'autre CSV/arrays
{
  console.log('Quakes all month: ' + earthquakes.length)

  for (var i = 1; i < earthquakes.length; i++) 
  {
    let data = earthquakes[i].split(/,/);  //  splitting csv
    //console.log(data);
    let lat = data[1];
    let lon = data[2];
    let mag = data[4];

    /*let x = Tools.mercX(lon) - cx;
    let y = Tools.mercY(lat) - cy;*/
    let {x,y} = Tools.p5.getMercatorCoord(lon, lat)
    // This addition fixes the case where the longitude is non-zero and
    // points can go off the screen.
    /*if(x < - width/2) {
      x += width;
    } else if(x > width / 2) {
      x -= width;
    }*/
    mag = pow(10, mag);  //  mapping magnitude exponentially with circle
    mag = sqrt(mag);
    let magmax = sqrt(pow(10, 10));
    let d = map(mag, 0, magmax, 0, 180);

    stroke('#ff9d00');
    fill('#ff9d00');
   // stroke(255, 0, 255);
    //fill(255, 0, 255, 200);
    ellipse(x, y, d, d);
  }
}


function chooseCity()
{
  var url = api + inputCity.value() + appid + units //var url = api + 'Quebec' + appid + units
  console.log(url)
  loadJSON( url, (cityData) => {
      console.log("Got it");
      console.log(cityData);
      weather = cityData;
      //console.log('weather:', weather)
      CityLon = weather.coord.lon;
      CityLat = weather.coord.lat;
      console.log("City  Lon: " + CityLon + " , Lat: " + CityLat);

      let {x,y} = Tools.p5.getMercatorCoord(CityLon, CityLat)
      console.log("City X: "+ x + "  Y: " + y );

      stroke(255, 0, 0);
      //fill(255, 10, 0, 150);
      fill(cityColor);
      ellipse(x, y, 10, 10)
  })
}


function getISS_location()
{
  //var url = 'http://api.open-notify.org/iss-now.json';
 //const url = '/data/iss'
  const url = 'https://api.wheretheiss.at/v1/satellites/25544'
  loadJSON(url, (data) => {
        Iss = data

        let {x,y} = Tools.p5.getMercatorCoord(Iss.longitude,Iss.latitude)

        stroke(0, 255, 0)
        fill(0, 255, 0, 200)
        ellipse(x, y, 4, 4)
  })
}


function drawBase(withGrid = false) 
{  
    image(mapimg, 0, 0)



    stroke(0, 0, 255)  // BLUE
    fill(0, 0, 255, 120)    //  BLUE + ALPHA
    let {x,y} = Tools.p5.getMercatorCoord(-71.2080,46.8139)
    ellipse(x, y, 10, 10)  // Show Qc City  -  46.8139° N, 71.2080° W

    drawText()

    displayEarthquakes()
    
    if(withGrid) Tools.p5.displayGrid(8,6,color(0,255,0,10), 1)
}


function windowResized() 
{
  resizeCanvas(windowWidth, windowHeight);
  drawBase()
}


function setup() {
 
  var canvas = createCanvas(ww, hh)
  canvas.parent(document.getElementById('mapLabel'))

  translate(width / 2, height / 2); //  set the 0,0 in the center of map
  imageMode(CENTER)
  drawBase()

  getISS_location()
  setInterval(getISS_location, 5000)

  

  //displayGrid(30,20,0, 1);
 
  //let legend1 = createDiv('hello there  mf')
  //legend1.style('font-family', 'Inconsolata')
  


  pTemp = select('#temp');
  pHumid = select('#humid');

  inputCity = select('#city');
  let button = select('#submit');
  button.mousePressed(chooseCity);
}


function draw()
{
  translate(width / 2, height / 2); //  set the 0,0 in the center of map

  if(weather)
  {
    pTemp.html("Temp :" + weather.main.temp);
    pHumid.html("Humid:" + weather.main.humidity);
  }
}


function setGrid() 
{ 
    let checkBox = document.getElementById("gridCheck");  
    drawBase(checkBox.checked)  // If the checkbox is checked, display grid
}