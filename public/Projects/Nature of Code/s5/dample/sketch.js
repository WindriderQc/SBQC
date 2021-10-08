// YB
// https://www.kadenze.com/courses/the-nature-of-code
// http://natureofcode.com/
// Session 5: Evolutionary Computing

// A World of trees with colorful leaves recursive trees
// The longer leaves live, 
// the closer of another nice leave they die with, 
// the more likely they are to reproduce
// When a couple of leaves die, a tree seed if planted


var world;

function setup() {
  createCanvas(1240, 720);
  // World starts with 20 creatures
  // and 20 pieces of food
  world = new World(20);
}

function draw() {
  background(175);
  world.run();
}

// We can add a tree manually if we so desire
function mousePressed() {
  world.born(mouseX,mouseY);
}

function mouseDragged() {
  world.born(mouseX,mouseY);
}
