let img;

function setup() {
  img = createImg('http://192.168.0.252:8081', 'unavailable') //note that this is not loadImage(), and is instead using p5.dom to create a <img> html element
  img.hide(); //hide the generated HTML element since we're going to use it later to load it into the canvas.
  createCanvas(600,600)
}

function draw(){
 //blendMode(HARD_LIGHT) // proof that this is on the canvas and not a HTML element from p5.dom
  image(img, 100, 100); //load the generated createImg p5.dom image into the canvas.
}