/*
  Nature of Code  and more...
  YB 
*/
/// <reference path="../p5.global-mode.d.ts" />

// Using this variable to decide whether to draw all the stuff
let debug = true;

let birdFlock

let img, imgRaven;

function preload() {
  img = loadImage('img/forest.jpg');
  imgRaven = loadImage('img/raven.png');
}

function setup()
{
  let text = createDiv("Click left-mouse to generate a new boids.<br>Press 'SPACE' to toggle boids trail");
  text.position(10, 780);
  
  createCanvas(1024,768);

  birdFlock = new Flock()
  // Make a whole bunch of vehicles with random maxspeed and maxforce values
  for (let i = 0; i < 120; i++) {
    let b = new Boid(random(width), random(height),1,random(-0.2,0.2) ,random(-0.2,0.2), random(2, 5), random(0.02, 0.05)) // imgRaven)
    b.activeTrail = true
    birdFlock.addBoid(b)
  }

} 

function draw()
{
  background(255);
  image(img, 0, 0);

  birdFlock.run()
 
}

function mousePressed() {
  let b = new Boid(mouseX, mouseY,1,random(-0.2,0.2) ,random(-0.2,0.2), random(2, 5), random(0.02, 0.05))
  b.activeTrail = true
  birdFlock.addBoid(b)

}

function keyPressed() {
  if (key == ' ') {
 
    for (let i = 0; i < birdFlock.boids.length; i++) {
      birdFlock.boids[i].activeTrail = !birdFlock.boids[i].activeTrail
      birdFlock.boids[i].trail = []
    }
 
  }
 
}





