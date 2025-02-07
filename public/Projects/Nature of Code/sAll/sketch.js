/*
  Nature of Code  and more...
  YB 
*/
/// <reference types="p5/global" />

// Using this variable to decide whether to draw all the stuff
let debug = true;

let flock
let separationSlider, alignmentSlider, cohesionSlider;

let img, imgRaven;

function preload() {
  img = loadImage('img/forest.jpg');
  imgRaven = loadImage('img/raven.png');
}

function setup()
{
    const canvas = createCanvas(1024,768);
    canvas.parent('canvas');

    // Get the slider elements
    separationSlider = select('#separationSlider');
    alignmentSlider = select('#alignmentSlider');
    cohesionSlider = select('#cohesionSlider');


    flock = new Flock()
    // Make a whole bunch of vehicles with random maxspeed and maxforce values
    for (let i = 0; i < 120; i++) {
        let b = new Boid(random(width), random(height),1,random(-0.2,0.2) ,random(-0.2,0.2), random(2, 5), random(0.02, 0.05)) // imgRaven)
        b.activeTrail = true
        flock.addBoid(b)
    }

} 


function draw()
{
  background(255);
  image(img, 0, 0);

  const separationSlider = document.getElementById("separation")


  flock.run(2,2,2)
 
}

function mousePressed() {
  let b = new Boid(mouseX, mouseY,1,random(-0.2,0.2) ,random(-0.2,0.2), random(2, 5), random(0.02, 0.05))
  b.activeTrail = true
  flock.addBoid(b)

}

function keyPressed() {
  if (key == ' ') {
 
    for (let i = 0; i < flock.boids.length; i++) {
      flock.boids[i].activeTrail = !flock.boids[i].activeTrail
      flock.boids[i].trail = []
    }
 
  }
 
}





