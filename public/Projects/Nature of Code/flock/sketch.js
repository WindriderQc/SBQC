/*
  Nature of Code  - Flocking
  YB 
*/
/// <reference types="p5/global" />


let birdFlock

let bckgnd

function preload() {
  bckgnd = loadImage('img/forest.jpg')
}

function setup()
{
  let text = createDiv("Click left-mouse to generate a new boids.<br>Press 'SPACE' to toggle boids trail")
  text.position(10, 780)
  
  createCanvas(1024,768)

  birdFlock = new Flock()

  // Make a whole bunch of boids with random speed, mass and force
  for (let i = 0; i < 60; i++) {
    let b = new Boid(random(width), random(height),1,random(-0.2,0.2) ,random(-0.2,0.2), random(2, 5), random(0.02, 0.05))
    b.activeTrail = true
    birdFlock.addBoid(b)
  }

} 

function draw()
{
  background(255);
  image(bckgnd, 0, 0);

  birdFlock.run()
 
}

function mousePressed() 
{
  let b = new Boid(mouseX, mouseY,1,random(-0.2,0.2) ,random(-0.2,0.2), random(2, 5), random(0.02, 0.05))
  b.activeTrail = true
  birdFlock.addBoid(b)
}

function mouseDragged() 
{
  let b = new Boid(mouseX, mouseY,1,random(-0.2,0.2) ,random(-0.2,0.2), random(2, 5), random(0.02, 0.05))
  b.activeTrail = true
  birdFlock.addBoid(b)
}

function keyPressed() 
{
  if (key == ' ') {
 
    for (let i = 0; i < birdFlock.boids.length; i++) {
      birdFlock.boids[i].activeTrail = !birdFlock.boids[i].activeTrail
      birdFlock.boids[i].trail = []
    }
 
  }
}
