/*

  Nature of Code : Session 1
  YB 

*/

var walker, walker2;

function setup() {
  createCanvas(320, 240);
  
  //create a default walker
  walker = new Walker();
  //create a second walker and set it yellow
  walker2 = new Walker(); 
  var c = color(255, 204, 0)
  walker2.setColor(c)


  background(220);
}

function draw() {
  // loop default walker
  walker.update();
  walker.render();

  // loop yellow walker
  walker2.update();
  walker2.render();
}