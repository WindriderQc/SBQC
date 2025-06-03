//   3D Earth section - rendered with P5

let internalIssPathHistory = [];
let MAX_HISTORY_POINTS = 4200; // Changed from const to let
let internalPredictedPath = []; // For 3D predicted path
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

// Add this function to public/js/earth3D.js
function set3DMaxHistoryPoints(newLimit) {
    if (typeof newLimit === 'number' && newLimit >= 0) {
        MAX_HISTORY_POINTS = newLimit;
        console.log(`[3D Path] MAX_HISTORY_POINTS updated to: ${MAX_HISTORY_POINTS}`);

        // Trim internalIssPathHistory if it exceeds the new limit
        // This ensures the array doesn't grow indefinitely beyond the new cap
        // and also trims it down if the new cap is smaller.
        while (internalIssPathHistory.length > MAX_HISTORY_POINTS) {
            internalIssPathHistory.shift(); // Remove oldest points
        }
        // p5.js draw() loop will automatically use the updated internalIssPathHistory
    } else {
        console.error('[3D Path] Invalid newLimit provided to set3DMaxHistoryPoints:', newLimit);
    }
}

function update3DPredictedPath(pointsFrom2D) {
    console.log('[3D Path] update3DPredictedPath called. Received pointsFrom2D length:', pointsFrom2D ? pointsFrom2D.length : 'undefined/null');
    if (pointsFrom2D && pointsFrom2D.length > 0) {
        console.log('[3D Path] First 3 received pointsFrom2D:', JSON.stringify(pointsFrom2D.slice(0, 3)));
    }

    if (Array.isArray(pointsFrom2D)) {
        // Create a new array of simple {lat, lon} objects
        // Note: pointsFrom2D from ejs uses {lat, lng}, so we map lng to lon
        internalPredictedPath = pointsFrom2D.map(p => ({ lat: p.lat, lon: p.lng }));
        console.log(`[3D Path] Updated internalPredictedPath with ${internalPredictedPath.length} points.`);
        if (internalPredictedPath.length > 0) {
            console.log('[3D Path] First 3 internalPredictedPath points after map:', JSON.stringify(internalPredictedPath.slice(0, 3)));
        }
    } else {
        console.warn('[3D Path] Invalid or no data received for update3DPredictedPath. Clearing predicted path.');
        internalPredictedPath = []; // Clear if data is invalid or empty
    }
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
            if (typeof point.latitude !== 'undefined' && typeof point.longitude !== 'undefined' && typeof point.timeStamp !== 'undefined') {
                internalIssPathHistory.push({
                    lat: point.latitude,
                    lon: point.longitude,
                    timeStamp: point.timeStamp // Store the timestamp
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

        // Notify that historical data is ready for prediction logic
        if (typeof window.onHistoricalDataReadyForPrediction === 'function') {
            console.log('[earth3D.js] Historical data ready, calling onHistoricalDataReadyForPrediction().');
            window.onHistoricalDataReadyForPrediction();
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

    // Guard for pushing live ISS data to internalIssPathHistory
    if (typeof iss !== 'undefined' && iss && typeof iss.latitude === 'number' && typeof iss.longitude === 'number') {
        let addPoint = true;
        if (internalIssPathHistory.length > 0) {
            const lastPoint = internalIssPathHistory[internalIssPathHistory.length - 1];
            // Check if lastPoint has lat/lon before comparing
            if (typeof lastPoint.lat === 'number' && typeof lastPoint.lon === 'number' &&
                lastPoint.lat === iss.latitude && lastPoint.lon === iss.longitude) {
                addPoint = false;
            }
        }

        if (addPoint) {
            // iss.timestamp is in milliseconds from the WebSocket server
            // Store as ISO string if converting, or ensure consistency if not.
            // For now, assume direct storage or that it's an ISO string.
            // The API historical data has timeStamp as ISO string.
            // The live data 'iss.timestamp' is ms since epoch.
            // To be consistent with historical data (which is now stored as ISO string via point.timeStamp)
            // we should convert live timestamp to ISO string as well, or convert historical to ms.
            // Let's convert live to ISO string for consistency with historical.
            // However, populateInitialIssHistory stores API's timeStamp (ISO string) directly.
            // And the ejs part converts that ISO string to ms for calculation.
            // So, for live data being added to internalIssPathHistory, we should add it in a format
            // that the EJS part can also parse with new Date().getTime().
            // The live `iss.timestamp` is already in ms.
            // `populateInitialIssHistory` stores the API's `timeStamp` (ISO string)
            // `calculateAndDisplayPassBy` converts historical `timeStamp` (ISO) to ms.
            // So, live data pushed to `internalIssPathHistory` should also have `timeStamp` in a format parseable by `new Date().getTime()`.
            // Milliseconds is fine, or convert to ISO string. Let's use the millisecond value directly if available.
            internalIssPathHistory.push({
                lat: iss.latitude,
                lon: iss.longitude,
                timeStamp: iss.timestamp ? iss.timestamp : new Date().getTime() // Use ms if available, else current time in ms
            });
        }

        // Ensure MAX_HISTORY_POINTS is respected
        while (internalIssPathHistory.length > MAX_HISTORY_POINTS) {
            internalIssPathHistory.shift();
        }
    }

    // Guard for drawing the ISS model
    if (typeof iss !== 'undefined' && iss && typeof iss.latitude === 'number' && typeof iss.longitude === 'number') {
        let v = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, iss.latitude, iss.longitude);
        push();
        translate(v.x, v.y, v.z);
        fill(0,0,0,0);
        texture(issGif);
        plane(issGif.width / issSize, issGif.height / issSize);
        pop();
    }

    // Draw ISS Path History (Orange Spheres) - This should always attempt to draw from internalIssPathHistory
    // It is NOT dependent on the 'iss' (live data) object being defined, so it's outside the above 'if(iss)'
    if (internalIssPathHistory.length > 0) { // Check if there's anything to draw
        push(); // Isolate path styles
        noStroke();
    fill(255, 165, 0, 150); // Orange, semi-transparent

    for (let i = 0; i < internalIssPathHistory.length; i++) {
        const histPoint = internalIssPathHistory[i];
        // Ensure histPoint itself and its lat/lon are valid before attempting to draw
        if (histPoint && typeof histPoint.lat === 'number' && typeof histPoint.lon === 'number') {
            let vPath = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, histPoint.lat, histPoint.lon);
            push();
            translate(vPath.x, vPath.y, vPath.z);
            sphere(pathPointSphereSize);
            pop();
        }
    }
    pop(); // End path styles
    }


    // Draw Predicted ISS Path (Green Line)
    if (internalPredictedPath && internalPredictedPath.length > 1) {
        console.log(`[3D Draw] Attempting to draw predicted path. Points: ${internalPredictedPath.length}`);
        push(); // Isolate styles for the predicted path

        stroke(0, 200, 0, 180); // Green color, slightly transparent
        strokeWeight(1.5);       // A bit thinner than the main path perhaps
        noFill();              // We are drawing lines, not filled shapes

        if (internalPredictedPath.length > 0) { // Log first vertex if available
            const firstVertPt = internalPredictedPath[0];
            if (typeof firstVertPt.lat === 'number' && typeof firstVertPt.lon === 'number') {
               let vFirstPred = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, firstVertPt.lat, firstVertPt.lon);
               console.log('[3D Draw] First predicted vertex:', `x:${vFirstPred.x.toFixed(2)}, y:${vFirstPred.y.toFixed(2)}, z:${vFirstPred.z.toFixed(2)}`);
            }
        }
        beginShape();
        for (let i = 0; i < internalPredictedPath.length; i++) {
            const predPoint = internalPredictedPath[i];
            // Ensure lat/lon are valid numbers before processing
            if (typeof predPoint.lat === 'number' && typeof predPoint.lon === 'number') {
                // Convert lat/lon to 3D coordinates. Altitude is same as main ISS path.
                let vPredPath = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, predPoint.lat, predPoint.lon);
                vertex(vPredPath.x, vPredPath.y, vPredPath.z);
            }
        }
        endShape();
        pop(); // Restore previous styles
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
