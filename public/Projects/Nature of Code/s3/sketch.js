/// <reference types="p5/global" />
/*

  Nature of Code : Session 3 - Steering and Flocking
  YB 

*/

var flock
var mouseHunter
var balls = []


var Yellow, Red, Green


function setup() {
  var canvas = createCanvas(1024, 768).parent('canvas')
  
  //  creating a blue boid which will chase the mouse
  mouseHunter = new Boid(10,10, 1,0,0)
  mouseHunter.setColor(color(0,0,255))
  mouseHunter.maxforce = 2
  mouseHunter.maxspeed = 3
 

  // create basic colors
  Yellow = color(255, 204, 0)
  Red = color(255, 0, 0)
  Green = color(0, 255, 0)


  flock = new Flock();
  // Add an initial set of boids into the system
  for (var i = 0; i < 80; i++) {
    var b = new Boid(width/2, height/2, 2, random(-1, 1), random(-1, 1))
    b.setColor(b.red)
    flock.addBoid(b);
  }

  //  Create a group of wandering balls
  for (var j = 0; j < 15; j++) {
    var ball = new NonLiving(random(0,width), random(0, height), random(0.5,1.5))
    ball.setVelocity(random(-1,1), random(-1,1))
    ball.setColor(Green)
    ball.r = 10
    balls.push(ball)
  }

}

//  main loop
function draw() {
  background(51)

  balls.forEach(function(b) {
    b.run()
  })

  // flocking boids avoiding balls
  flock.run(balls) 


  var target = createVector(mouseX, mouseY)
  highlight(target,Yellow, 15 )

  // blue boid seeking mouse pos
  mouseHunter.applyForce( mouseHunter.arrive(target,50))
  mouseHunter.run()

}


// create a circle around the target position
function highlight(target, color, r)
{
  var target = createVector(mouseX, mouseY)
  var c = color
  //c.setAlpha(128 + 128 * sin(millis() / 500));
  c.setAlpha(125)
  stroke(c)
  strokeWeight(1)
  fill(c)
  ellipse(target.x, target.y, r,r)
}
