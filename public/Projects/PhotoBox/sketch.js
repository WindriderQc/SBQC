function setup() 
{
    const canvas = createCanvas(160, 120);
    pixelDensity(1);
    background(0);
    let lat, lon;
    const button = document.getElementById('submit');
    button.addEventListener('click', async event => {
      const mood = document.getElementById('mood').value;
      canvas.loadPixels();
      const image64 = canvas.elt.toDataURL();
      const data = { lat, lon, mood, image64 };
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      };
      const response = await fetch('/checkins/api', options);
      const json = await response.json();
      console.log(json);
    });
  
    if ('geolocation' in navigator) {
      console.log('geolocation available');
      navigator.geolocation.getCurrentPosition(position => {
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        console.log(lat, lon);
        document.getElementById('latitude').textContent = lat;
        document.getElementById('longitude').textContent = lon;
      });
    } else {
      console.log('geolocation not available');
    }
  }
  
/*


  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  video.parent(document.getElementById('cam_id'))



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
      const response = await fetch('/checkins/api', options)
      const json = await response.json()
      console.log(json)

  })
*/


  function keyPressed() {
    if (key == 'c') {
      background(0);
    }
  }
  
  
  function draw() {
    stroke(255);
    strokeWeight(8);
    if (mouseIsPressed) {
      line(pmouseX, pmouseY, mouseX, mouseY);
    }
  }





//  
//  <div><img src="" id='rainbow' width ="480" /></div>
//

async function catchRainbow() {
    const response =  await fetch('/img/screenShotLevel1.png')
    const blob = await response.blob()
    document.getElementById('rainbow').src = URL.createObjectURL(blob)
  }
  
  
  catchRainbow()
      .then(response => {
        console.log('got it')
      })
      .catch(error => {
        console.log('error!'); 
        console.log(error)
      })
  