// YB
// https://www.kadenze.com/courses/the-nature-of-code
// http://natureofcode.com/
// Session 5: Evolutionary Computing

// A World of trees with colorful leaves recursive trees
// The longer leaves live, 
// the closer of another nice leave they die with, 
// the more likely they are to reproduce
// When a couple of leaves die, a tree seed if planted


var forest
var lifeDuration = 0

function setup() {
  createCanvas(1024, 768)
  // Create a Forest with X trees at start
  forest = new Forest(6)
  textSize(40)
}

var forestStarted = false
var waitTime = 0

function draw() {
  background(255)
  forest.run()

  if( (forest.trees.length > 0)   &&  !forestStarted) 
    forestStarted = true

  if(forestStarted)  //  protection again first loops where trees are not created yet
  {
      if(forest.trees.length === 0) {
              
        textAlign(CENTER);
        text('Life isnt anymore...', width * 0.5, height * 0.5 );

        waitTime += deltaTime
       // wait a bit to display life end message
        while(waitTime > 2000) {
          forestStarted = false
          waitTime = 0
          console.log('RESTART Sketch')
          setup()
        }     
    
      }
  }


  lifeDuration += deltaTime
  firstLoop = false  
}

// We can add a tree manually if we so desire
function mousePressed() {
  forest.plantTree(mouseX,mouseY)
}

function mouseDragged() {
  forest.plantTree(mouseX,mouseY)
}