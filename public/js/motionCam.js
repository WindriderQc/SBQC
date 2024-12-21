let cam;

const gifLength = 180
let p5Canvas
let canvas

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

let isInspect = false
let motioncount = 0



let capture;


function setup() 
{

  const canvasDiv = document.getElementById('p5canvas');
  const w = canvasDiv.offsetWidth;
  console.log('canvas offset width:', w)
  p5Canvas = createCanvas(640, 480)
  p5Canvas.parent('p5canvas')
  pixelDensity(1)

  capture = createCapture(VIDEO);
  capture.parent(canvasDiv)


  CAMERA_URL = "http://192.168.0.33/cams/blackpi";
  //imageStream = createImg(CAMERA_URL);
  //imageStream = loadImage(CAMERA_URL);

 

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  video.parent(document.getElementById('clientCam_id'))

  //btn = document.getElementById('recBtn')
          //btn.parent(document.getElementById('recBtn'))
  //btn.textContent = "start recording"
        //document.body.appendChild(btn)
  //btn.onclick = record


  // Create an empty image the same size as the video
  prevFrame = createImage(width, height, RGB)

  const inspectDiv = document.getElementById('inspectBtn')  
  const inspectBtn = createButton('Inspect')
  inspectBtn.parent(inspectDiv)
  inspectBtn.style('font-size', '30px');
  //inspectBtn.style('background-color', color(0,0,0));
  //inspectBtn.style('color', color(255,255,255));
  //inspectBtn.style('border-radius', '12px');
  inspectBtn.addClass('btn-secondary')
  inspectBtn.addClass('btn')
  inspectBtn.addClass('px-3')

  inspectBtn.mousePressed( () => { 
      isInspect = !isInspect
      //change button style
      if(isInspect) {
        inspectBtn.removeClass('btn-secondary')
        inspectBtn.addClass('btn-danger')
      }  
      else {
        inspectBtn.removeClass('btn-danger')
        inspectBtn.addClass('btn-secondary')
      }
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

    if(isInspect) {

        image(prevFrame, 0, 0);
        
        loadPixels();
        
        video.loadPixels()
        prevFrame.loadPixels()

        let pixelCount = 0

        // Begin loop to walk through every pixel
        for (let x = 0; x < width; x ++ )     {
            for (let y = 0; y < height; y ++ )     {
              // Step 1, what is the location into the array
              let loc = (x + y * width) * 4
              // Step 2, what is the previous color
              let r1 = prevFrame.pixels[loc ]
              let g1 = prevFrame.pixels[loc + 1]
              let b1 = prevFrame.pixels[loc + 2]
              // Step 3, what is the current color
              let r2 = video.pixels[loc   ]
              let g2 = video.pixels[loc + 1]
              let b2 = video.pixels[loc + 2]

              // Step 4, compare colors (previous vs. current)
              let diff = dist(r1, g1, b1, r2, g2, b2)

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
      

    }
    
    

    /*if(capturer) {
        capturer.capture(canvas);  
    }*/
}









async function sendAlert()  //  TODO: pkoi pas utiliser la version dans TOols?
{
    image(video, 0, 0)  // gets the video image instead of pixel analysis for a cleaner email
    p5Canvas.loadPixels();
    
    const image64 = p5Canvas.elt.toDataURL();
    const dest = document.getElementById('dest_id').value
    const msg = 'Motion Detected!'

    const data = { dest, msg, image64 };
    const options = {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',  // 'application/json' //'text/html'  
        //'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify(data)
    };
  
    console.log('Sending alert email')
    console.log(dest, msg )
    const response = await fetch('/alert', options); 
    const json = await response.json();
    console.log(json); 
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




