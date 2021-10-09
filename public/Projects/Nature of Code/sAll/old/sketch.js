/*
  Nature of Code  and more...
  YB 
*/
/// <reference path="../p5.global-mode.d.ts" />


// A path object (series of connected points)
let path;

// Using this variable to decide whether to draw all the stuff
let debug = true;

// Two vehicles
let car1;
let car2;


// Flow Field Following
// Via Reynolds: http://www.red3d.com/cwr/steer/FlowFollow.html

// Flowfield object
let flowfield;
// An ArrayList of vehicles
let vehicles = [];

let birdFlock


let img, imgRaven;

function preload() {
  img = loadImage('img/forest.jpg');
  imgRaven = loadImage('img/raven.png');
}

let colorPick 
let colorLabel

function setup()
{
  let text = createDiv("Hit space bar to toggle debugging lines.<br>Click the mouse to generate a new flow field.");
  text.position(10, 800);
  let colorText = createP('color at mouse pos: ') 
  colorText.position(10, 850);

  colorLabel = createP('xxx')
  colorLabel.position(150, 850)
  
  createCanvas(1024,768);

  colorPick = new ColorPick()

  newPath()

  console.log(path)
  // Each vehicle has different maxspeed and maxforce for demo purposes
  car1 = new Boid(0, height / 2, 1, 1,0, 2, 0.04, null);
  car2 = new Boid(0, height / 2, 1, 1,0, 3, 0.1, null);


  // Make a new flow field with "resolution" of 20
  //flowfield = new FlowField(20);

  birdFlock = new Flock()
  // Make a whole bunch of vehicles with random maxspeed and maxforce values
  for (let i = 0; i < 120; i++) {
    let b = new Boid(random(width), random(height),1,0,0, random(2, 5), random(0.1, 0.5), null)// imgRaven)
   // vehicles.push(b);

    birdFlock.addBoid(b)
  }

  
 
} 

function draw()
{
  background(255);
  image(img, 0, 0);
  // Display the path
  path.display();
  // The boids follow the path
  car1.followPath(path);
  car2.followPath(path);
  // Call the generic run method (update, borders, display, etc.)
  car1.run(false);
  car2.run(false);

  // Check if it gets to the end of the path since it's not a loop
  car1.borders(path);
  car2.borders(path);
/*
  // Display the flowfield in "debug" mode
  if (debug) flowfield.display();
  // Tell all the vehicles to follow the flow field
  for (let i = 0; i < vehicles.length; i++) {
    vehicles[i].followField(flowfield);
    vehicles[i].run(true);
  }*/

  birdFlock.run()

  colorPick.updateRender(true, 25) 
  colorLabel.html(colorPick.pointColor)
 // console.log()

}

function newPath() {
  // A path is a series of connected points
  // A more sophisticated path might be a curve
  path = new Path();
  path.addPoint(-20, height / 2);
  path.addPoint(random(0, width / 2), random(0, height));
  path.addPoint(random(width / 2, width), random(0, height));
  path.addPoint(width + 20, height / 2);
}

function mousePressed() {
  newPath();
  flowfield.init();
}

function keyPressed() {
  if (key == ' ') {
    debug = !debug;
  }
}





