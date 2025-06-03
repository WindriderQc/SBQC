//   3D Earth section - rendered with P5

let internalIssPathHistory = [];
const MAX_HISTORY_POINTS = 4200;
const pathPointSphereSize = 2;

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
        issGif = loadImage('/img/iss.png');
    loadJSON('https://data.specialblend.ca/iss', populateInitialIssHistory);
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

function populateInitialIssHistory(responseData) {
    if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
        console.log('Received historical ISS data. Points in data array:', responseData.data.length);

        // Sort by timeStamp in ascending order
        let pointsToProcess = responseData.data.sort((a, b) => {
            // Assuming timeStamp is a number or can be converted to a number (e.g., Unix timestamp)
            // If timeStamp is a string date, new Date(a.timeStamp) - new Date(b.timeStamp) might be needed
            return a.timeStamp - b.timeStamp;
        });

        console.log('Sorted historical ISS data by timeStamp. Points available after sort:', pointsToProcess.length);

        // Slice to get the most recent MAX_HISTORY_POINTS if necessary
        if (pointsToProcess.length > MAX_HISTORY_POINTS) {
            pointsToProcess = pointsToProcess.slice(pointsToProcess.length - MAX_HISTORY_POINTS);
            console.log(`Sliced data to the most recent ${MAX_HISTORY_POINTS} points. Points to process:`, pointsToProcess.length);
        }

        for (let i = 0; i < pointsToProcess.length; i++) {
            const point = pointsToProcess[i];
            if (typeof point.latitude !== 'undefined' && typeof point.longitude !== 'undefined') {
                internalIssPathHistory.push({
                    lat: point.latitude,
                    lon: point.longitude
                });
            }
        }
        // Ensure history doesn't exceed MAX_HISTORY_POINTS after preloading
        while (internalIssPathHistory.length > MAX_HISTORY_POINTS) {
           internalIssPathHistory.shift(); // Remove oldest points
        }
        console.log('Internal ISS history populated. Points now stored:', internalIssPathHistory.length);

        // Call the function to display historical data on the 2D map
        if (typeof window.displayHistoricalDataOn2DMap === 'function') {
            window.displayHistoricalDataOn2DMap(internalIssPathHistory);
        }
    } else {
        let reason = 'Unknown reason';
        if (!responseData) {
            reason = 'Response data is null or undefined.';
        } else if (!responseData.data) {
            reason = 'The "data" property in response is null or undefined.';
        } else if (!Array.isArray(responseData.data)) {
            reason = 'The "data" property in response is not an array.';
        } else if (responseData.data.length === 0) {
            reason = 'The "data" array in response is empty.';
        }
        console.log(`No valid historical ISS data found to populate initial history. Reason: ${reason}. Full response:`, responseData);
    }
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


    if (typeof iss !== 'undefined' && iss && typeof iss.latitude !== 'undefined' && typeof iss.longitude !== 'undefined') {
        // Check if the latest history point is different from current iss coords to avoid too many identical points
        let addPoint = true;
        if (internalIssPathHistory.length > 0) {
            const lastPoint = internalIssPathHistory[internalIssPathHistory.length - 1];
            if (lastPoint.lat === iss.latitude && lastPoint.lon === iss.longitude) {
                addPoint = false;
            }
        }

        if (addPoint) {
            internalIssPathHistory.push({
                lat: iss.latitude,
                lon: iss.longitude
                // We'll use earthSize + issDistanceToEarth for altitude when drawing
            });
        }

        if (internalIssPathHistory.length > MAX_HISTORY_POINTS) {
            internalIssPathHistory.shift();
        }
    }

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

    // Draw ISS Path History
    push(); // Isolate path styles
    noStroke();
    fill(255, 165, 0, 150); // Orange, semi-transparent

    for (let i = 0; i < internalIssPathHistory.length; i++) {
        const histPoint = internalIssPathHistory[i];
        let vPath = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, histPoint.lat, histPoint.lon);

        push();
        translate(vPath.x, vPath.y, vPath.z);
        sphere(pathPointSphereSize);
        pop();
    }
    pop(); // End path styles
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
