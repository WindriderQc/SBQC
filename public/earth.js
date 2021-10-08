// Earth Explorer


/*
// Latitude and longitude are expected to be in radians!
float xPos = (_radius) * Mathf.Cos(latitude) * Mathf.Cos(longitude);
float zPos = (_radius) * Mathf.Cos(latitude) * Mathf.Sin(longitude);
float yPos = (_radius) * Mathf.Sin(latitude);
*/

//import Chart from 'Chart.min.js';

var mapimg;
var mapStyle = 'mapbox/dark-v9';   //  mapbox/dark-v9   //  'windrider/cjs5io5kz1mvq1fqjb1x3e0ta'
var clat = 0;
var clon = 0;

var ww = 1200;
var hh = 800;
var cx, cy ;
var zoom = 1; //  used in gathering Map and Coordinates system conversion

var api = '//api.openweathermap.org/data/2.5/weather?q=';
var inputCity;
var appid = '&APPID=3acd322267c6cf3b8b697d7a4e9f78cb';  // Personal API key
var units = '&units=metric';

var pTemp;
var pHumid;
var pPPM;
var earthquakes; // preloaded
var weather;  // actualized

var Iss;
var issx = 0.0000;
var issy = 0.0000;
var CityX = 0.0000;
var CityY = 0.0000;



function preload() {
  //mapimg = loadImage('https://api.mapbox.com/styles/v1/' + mapStyle + '/static/' +                
  //                   clon + ',' + clat + ',' + zoom + '/' +  ww + 'x' + hh + '?access_token=pk.eyJ1Ijoid2luZHJpZGVyIiwiYSI6ImNqczVldmR3bzBmMWU0NHRmbjlta2Y0aDEifQ.FWOdvqw-IBlcJrBKKML7iQ', printMap);
  // mapimg.save('darkmap1200x800', 'png');   //  save image from API
  mapimg = loadImage('img/darkmap1200x800.png')

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

// converts from Longitude/Latitude to Graphical x,y - Mercator
function mercX(lon) {
  lon = radians(lon);
  var a = (256 / PI) * pow(2, zoom);
  var b = lon + PI;
  return a * b;
}
function mercY(lat) {
  lat = radians(lat);
  var a = (256 / PI) * pow(2, zoom);
  var b = tan(PI / 4 + lat / 2);
  var c = PI - log(b);
  return a * c;
}


function displayEarthquakes()   //  TODO:  faire une generic method pour utiliser avec d'autre CSV/arrays
{
  console.log('Quakes all month: ' + earthquakes.length)

  for (var i = 1; i < earthquakes.length; i++) 
  {
    var data = earthquakes[i].split(/,/);  //  splitting csv
    //console.log(data);
    var lat = data[1];
    var lon = data[2];
    var mag = data[4];

    var x = mercX(lon) - cx;
    var y = mercY(lat) - cy;
    
    // This addition fixes the case where the longitude is non-zero and
    // points can go off the screen.
    /*if(x < - width/2) {
      x += width;
    } else if(x > width / 2) {
      x -= width;
    }*/
    mag = pow(10, mag);  //  mapping magnitude exponentially with circle
    mag = sqrt(mag);
    var magmax = sqrt(pow(10, 10));
    var d = map(mag, 0, magmax, 0, 180);

    stroke('#ff9d00');
    fill('#ff9d00');
    ellipse(x, y, d, d);
  }
}

function displayGrid(r,l, color = 0, weight = 1)   //  smallest weight = 1 pixel
{
  for (var x = -width/2; x < width/2; x += width / r) {
    for (var y = -height/2; y < height/2; y += height / l) {
      stroke(color);
      strokeWeight(weight);
      line(x, -height/2, x, height/2);
      line(-width /2, y, width/2, y);
    }
  }
}

  
function chooseCity()
{
 // var url = api + inputCity.value() + appid + units

  var url = api + 'Quebec' + appid + units
  print(url)
  loadJSON( url, gotWeather, 'json') 
}
function gotWeather(cityData)
{
  print("Got it");
  print(cityData);
  weather = cityData;
  CityX = weather.coord.lon;
  CityY = weather.coord.lat;
  print("City  Lon: " + CityX + " , Lat: " + CityY);
  var x = mercX(CityX)-cx;
  var y = mercY(CityY)-cy;
  print("City X: "+ x + "  Y: " + y );
}
function getISS_location()
{
  //var url = 'http://api.open-notify.org/iss-now.json';

  //const url = 'https://api.wheretheiss.at/v1/satellites/25544'
  const url = '/data/iss'

  loadJSON(url, gotISSloc);
}

function gotISSloc(data)
{
  //console.log(data)
  Iss = data; 
  issx = Iss.longitude;
  issy = Iss.latitude;
  //var x = mercX(issx)-cx;
 // var y = mercY(issy)-cy;
 var x = mercX(issx)-cx;
 var y = mercY(issy)-cy;

 stroke(0, 255, 0);
 fill(0, 255, 0, 200);
 ellipse(x, y, 4, 4);

}

function setup() {
 
  var canvas = createCanvas(ww, hh)
  canvas.parent(document.getElementById('mapLabel'))
  translate(width / 2, height / 2); //  set the 0,0 in the center of map
  imageMode(CENTER)
  image(mapimg, 0, 0)
  cx = mercX(clon) // define center offset
  cy = mercY(clat)
 
  stroke(0, 0, 255)  // BLUE
  fill(0, 0, 255, 120)    //  BLUE + ALPHA
  // Show Qc City  -  46.8139° N, 71.2080° W
  ellipse(mercX(-71.2080)-cx, mercY(46.8139)-cy, 10, 10)


  earthquakes = loadStrings('data/quakes.csv', displayEarthquakes);


  //displayGrid(30,20,0, 1);
 

  //let legend1 = createDiv('hello there  mf')
  //legend1.style('font-family', 'Inconsolata')
  
  //inputCity = select('#city');

  //var button = select('#submit');
  //button.mousePressed(chooseCity);

  //pTemp = select('#temp');
  //pHumid = select('#humid');
  //pPPM = select('#ppm');

  drawText()
  getISS_location()
  setInterval(getISS_location, 5000)
  //setInterval(getPPM, 5000)
}


function draw()
{
  translate(width / 2, height / 2); //  set the 0,0 in the center of map

  /*if(weather)
  {
    pTemp.html("Temp :" + weather.main.temp);
    pHumid.html("Humid:" + weather.main.humidity);
    stroke(255, 0, 0);
    fill(255, 10, 0, 150);
    ellipse(mercX(CityX)-cx, mercY(CityY)-cy, 10, 10)
  }*/
 
  /*if(Iss)
  {
    var x = mercX(issx)-cx;
    var y = mercY(issy)-cy;
    stroke(0, 255, 0);
    fill(0, 255, 0, 200);
    ellipse(x, y, 4, 4);
  } */
}