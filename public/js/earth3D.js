//   3D Earth section - rendered with P5

let rotationSpeed = (Math.PI * 2) / 60; // One full rotation every 60 seconds
let angle = 0;

let cloudyEarth;
let earthquakes

let issGif

const earthSize = 300
const gpsSize = 5
const issSize = 6
const issDistanceToEarth = 50

function preload()
{
    // The clon and clat in this url are edited to be in the correct order.
        /*cloudyEarth = loadImage('https://api.mapbox.com/styles/v1/' + 'windrider/cjs5io5kz1mvq1fqjb1x3e0ta' + '/static/' +
        0 + ',' + 0 + ',' + 1 + '/' +
        1028 + 'x' + 1028 +
        '?access_token=pk.eyJ1Ijoid2luZHJpZGVyIiwiYSI6ImNqczVldmR3bzBmMWU0NHRmbjlta2Y0aDEifQ.FWOdvqw-IBlcJrBKKML7iQ');        */
        cloudyEarth = loadImage('/img/cloudyEarth.jpg') //, 0,0,width,height);
        earthquakes = loadStrings('/data/quakes.csv'); // loadStrings('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv');
        issGif = loadImage('/img/iss.png')
}


function setup()
{
  var canvas = createCanvas(1280, 720, WEBGL)
  // Move the canvas so it’s inside our <div id="sketch-holder">.
  canvas.parent('sketch-holder');
  //  var cnv = createCanvas(windowWidth, windowHeight);
  // cnv.style('display', 'block');  //  prevents scrool bar to show...

}

/* function windowResized()    //  called everytime the browser window is resized.
{
  resizeCanvas(windowWidth, windowHeight);
} */

function keyPressed() {
  if (key === 's') {
   saveCanvas('earth3d', 'png');
  }
}

function mouseClicked() {
 //
}


function draw()
{
    background(52)
    angle = (millis() / 1000) * rotationSpeed;

    //move your mouse to change light position
    let locX = mouseX - width / 2;
    let locY = mouseY - height / 2;
    //let v = createVector(locX, locY, 0)
    //let v = createVector(1, 1, 0)

    //v.div(100)
    //directionalLight(255,255,0, v);
    ambientLight(250)
    // to set the light position,
    // think of the world's coordinate as:
    // -width/2,-height/2 -------- width/2,-height/2
    //                |            |
    //                |     0,0    |
    //                |            |
    // -width/2,height/2--------width/2,height/2
   // pointLight(250, 250, 250, locX, locY, 100);

    // pointLight(0,0,255, 0, -200, 0)
    //pointLight(255,0,0,0, 200,0)

    //ambientMaterial(250)
    texture(cloudyEarth)
    //specularMaterial(250)
    //specularMaterial(75,75,255);
    //fill(0,0,255)
   // stroke(0.5)
    noStroke()
    //normalMaterial()

   //rotateZ(23);
   rotateY(angle);

   texture(cloudyEarth)
   sphere(earthSize)
  // rotateZ(-23);
   rotateY(11);


   if(iss)
   {
     let v =  Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, iss.latitude, iss.longitude)

     push();
     translate(v.x, v.y, v.z)

     fill(0,0,0,0)
     texture(issGif)
     plane(issGif.width / issSize, issGif.height / issSize)


     //fill(150, 200, 255)
     //sphere(15)
     pop();
   }

   //  Showing Québec on earth  TODO:  show user location
   let p =  Tools.p5.getSphereCoord(earthSize,46.8139,-71.2080)
   push();
   translate(p.x, p.y, p.z);
   fill(255,255,0)
   sphere(gpsSize)
   pop();

    show3DQuakes();
    // angle -= 0.01; // Replaced by time-based calculation
  }




  function show3DQuakes()
  {

    for (var i = 1; i < earthquakes.length; i++) {
      var data = earthquakes[i].split(/,/);  //  splitting csv
      var lat = data[1];
      var lon = data[2];
      var mag = data[4];

      let pos =  Tools.p5.getSphereCoord(earthSize, lat, lon)

      var h = pow(10, mag);
      var maxh = pow(10, 8);
      h = map(h, 0, maxh, 1, 100);
      let xaxis = createVector(1, 0, 0);
      var angleb = xaxis.angleBetween(pos);
      let raxis = xaxis.cross(pos);

      from = color(0, 255, 0);
      to = color(255, 0, 0);
      c = lerpColor(from, to, map(float(mag), -1, 10, 0,1))

      push();
      translate(pos.x, pos.y, pos.z);
      rotate(angleb, raxis);
      fill(c);
      if(mag <= 0 )
        sphere(0.5)
      else
        sphere(h);
     //box(h, 5, 5);
      pop();


    }
  }
