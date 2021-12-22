let capture;

function setup() {
  createCanvas(1280, 720);
  capture = createCapture(VIDEO);
  //capture.parent(document.getElementById('clientCam_id'))
  capture.hide();
}

function draw() {
  image(capture, 0, 0, width, width * capture.height / capture.width);
  filter(INVERT);
}



/*
  // cam serv

  let capture;

  function setup() 
  {
      capture = createCapture(VIDEO);
      capture.parent(document.getElementById('clientCam_id'))
  }

*/