let cam;

const gifLength = 180
let p5Canvas
let canvas

let pg

var CAMERA_URL = ""

var imageStream = null


// Variable for capture device
let video
let motionFrame
// Previous Frame
let prevFrame
// How different must a pixel be to be a "motion" pixel
const threshold = 25 //50

const DETECTION_PCT = 0.02
const FRAME_TRIGGER = 10

//let capturer;
//let btn;

let motioncount = 0


async function getZonAnn() {
  const response = await fetch('ZonAnn.Ts+dSST.csv')
  const data = await response.text()

  const table = data.split('\n').slice(1)   //  slice delete line 1
  
  table.forEach(row => {
    const columns = row.split(',')
    const year = columns[0]
    const temp = columns[1]

    //console.log(year, temp)
  })
  



}


function setup() 
{


  /*catchRainbow()
    .then(response => {
      console.log('got it')
    })
    .catch(error => {
      console.log('error!'); 
      console.log(error)
    })
*/
    //  https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv

  console.log('about to fetch ZoneAnn')
  getZonAnn() 




  const canvasDiv = document.getElementById('p5canvas');
  const w = canvasDiv.offsetWidth;
  p5Canvas = createCanvas(640, 480)
  p5Canvas.parent('p5canvas')
  canvas = p5Canvas.canvas
  //noCanvas();
  pixelDensity(1)

  //frameRate(30)




  CAMERA_URL = "http://192.168.0.33/cams/blackpi";
  //imageStream = createImg(CAMERA_URL);
  //imageStream = loadImage(CAMERA_URL);

 

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  video.parent(document.getElementById('cam_id'))

  //btn = document.getElementById('recBtn')
          //btn.parent(document.getElementById('recBtn'))
  //btn.textContent = "start recording"
        //document.body.appendChild(btn)
  //btn.onclick = record


  // Create an empty image the same size as the video
  prevFrame = createImage(width, height, RGB)

   
  const button = document.getElementById('submit')
  button.addEventListener('click', async event => {

      const mood = document.getElementById('mood').value;
      video.loadPixels()
      const image64 = video.canvas.toDataURL()
      const data = { lat, lon, mood, image64 }
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
      const response = await fetch('/api', options)
      const json = await response.json()
      console.log(json)

  })
  
   
}


/*
function captureEvent(video) 
{
  // Save previous frame for motion detection!!
  prevFrame.copy(video, 0, 0, video.width, video.height, 0, 0, video.width, video.height); // Before we read the new frame, we always save the previous frame for comparison!
  prevFrame.updatePixels();  // Read image from the camera
  video.read();
  console.log("Capture Event!!!!!!!!!!!!!!!!!!!!")
}*/

function draw() 
{
    image(prevFrame, 0, 0);
     
    loadPixels();
    prevFrame.loadPixels();
    video.loadPixels()

    let pixelCount = 0

    // Begin loop to walk through every pixel
    for (var x = 0; x < width; x ++ ) 
    {
        for (var y = 0; y < height; y ++ ) 
        {

          // Step 1, what is the location into the array
          var loc = (x + y * width) * 4;
          
          // Step 2, what is the previous color
          var r1 = prevFrame.pixels[loc ]; 
          var g1 = prevFrame.pixels[loc + 1];
          var b1 = prevFrame.pixels[loc + 2];

          // Step 3, what is the current color
          var r2 = video.pixels[loc   ]; 
          var g2 = video.pixels[loc + 1];
          var b2 = video.pixels[loc + 2];

          // Step 4, compare colors (previous vs. current)
          var diff = dist(r1, g1, b1, r2, g2, b2);

          // Step 5, How different are the colors?
          // If the color at that pixel has changed, then there is motion at that pixel.
          if (diff > threshold) { 
            // If motion, display black
            //pixels[loc] = 0;
            //pixels[loc+1] = 0;
            //pixels[loc+2] = 0;
            pixels[loc+3] = 255;

            pixelCount++;
          } else {
              // If not, display white
              pixels[loc] = 255;
              pixels[loc+1] = 255;
              pixels[loc+2] = 255;
              pixels[loc+3] = 255;
          }
        }
    }
    updatePixels();



      if(pixelCount >= (DETECTION_PCT * width * height))
      {
          if(motioncount > FRAME_TRIGGER) {
            
              motioncount = 0
              console.log('motion detection')
              if(document.getElementById("alertEnable").checked)  
                sendAlert()
          }  
          else motioncount++
      }

      // Save frame for the next cycle
      prevFrame.copy(video, 0, 0, video.width, video.height, 0, 0, video.width, video.height);
      
    

    /*if(capturer) {
        capturer.capture(canvas);  
    }*/
}



async function sendAlert()
{
    image(video, 0, 0)
    p5Canvas.loadPixels();
    
    const image64 = p5Canvas.elt.toDataURL();
    const dest = document.getElementById('dest_id').value
    const msg = 'Motion Detected!'

    const data = { dest, msg, image64 };
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
    const response = await fetch('/alert', options);
    const json = await response.json();
    console.log(json);
   
} 



async function catchRainbow() {
  const response =  await fetch('/img/screenShotLevel1.png')
  const blob = await response.blob()
  document.getElementById('rainbow').src = URL.createObjectURL(blob)
}

/*
function record() 
{
  capturer = new CCapture({ format: 'webm' , framerate: 30, verbose: true , name: 'motionDetect', quality: 100} );
  capturer.start();
  btn.textContent = 'stop recording';

  btn.onclick = e => {
    capturer.stop();
    capturer.save();
    capturer = null;

    btn.textContent = 'start recording';
    btn.onclick = record;
  };
}

*/







