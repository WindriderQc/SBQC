/*

  Nature of Code : Session 4 - Fractals
  YB 

*/

var forest = []

// create canvas and randomly create 12 trees in time
function setup()
{

  createCanvas(1024,768);

  for(var i = 0; i < 12; i++)  //  Create a 12 trees simulation
  {
    setTimeout(() => {  createTree(); }, random(500, 2500));  // create a tree every .5 to 2.5 sec
  }

}

// Create a tree randomly on screen and store it in forest array
function createTree()
{

  var t = new Tree()
  t.grow(createVector(random(50,width-50), random(150,height-50)), random(-1, -3.5))
  forest.push(t)

}

// Display all trees, delete dead trees and create new ones.
function draw()
{

  background(255);

  for (var i = 0; i < forest.length; i++)
  { 
    let isDone = forest[i].dynamicTree()  // draw all trees and leaves
    if(isDone)
    {
      forest.splice(i, 1)  //  Delete dead tree
      createTree()          // create new random tree
    }
  }
  
}