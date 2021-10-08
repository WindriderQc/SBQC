/*

  Nature of Code : Session 2
  YB 

*/


var hunter
var particles = []
var walkers = []
var attractor;

function setup() {
  createCanvas(640, 480)
  
  // create basic colors
  var yellow = color(255, 204, 0)
  var red = color(255, 0, 0)
  var green = color(0, 255, 0)

  // create a yellow walker that will chase mouse
  hunter = new Walker(width / 2, height/2, 1)
  hunter.setColor(yellow)

  // create a bunch of red random walkers 
  for(var i = 0; i< 10; i++) {
    walkers.push(new Walker(random(width),random(height),random(1,5)))
    walkers[i].setColor(red)
  }

  // create an attrator at screen center 
  attractor = new Attractor(width/2, height/2);

  // create a bunch of Particles to gravitate around the attractor.
  for(var i = 0; i< 200; i++) {
    particles.push(new Particle(random(width),100,random(2,4), 1,0))

    if(particles[i].mass < 3) // split particles in 2 colors upon their mass
      particles[i].setColor(green)
    else particles[i].setColor(yellow)
  }

}

//  Add a particle at mouse click
function mousePressed() {
  const p = new Particle(random(width),100,random(2,4), 1,0)
  particles.push(p)
}

// Remove a particle when Space key is pressed
function keyPressed() {
  if(key ==' ') {
    particles.splice(0,1)
  }
}

function draw() { 
  background(51)

  //var gravity = createVector(0,0.1)
  //var wind = createVector(0.01,0)

  attractor.render();

  //  loop particles to apply forces and display
  particles.forEach(function(p){
      var attraction = attractor.calculateAttraction(p);
      p.applyForce(attraction);
      p.update()
      p.edges()
      p.render() 
  })
 
  // loop hunting walker  
  hunter.follow(createVector(mouseX, mouseY), 0.05)
  hunter.update()
  hunter.edges(false) //  clamp to edges
  hunter.render()

  //  loop walkers to apply forces and display
  walkers.forEach(function(w) {
    w.randomWalk()
    w.update()
    w.edges(true)  // bounce on edges
    w.render()
  })

}