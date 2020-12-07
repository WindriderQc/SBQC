/*
  Nature of Code  and more...
  YB 
*/
/// <reference path="../p5.global-mode.d.ts" />

let colorPick 
let colorLabel

let dropzone

let img

function preload() 
{
  img = loadImage('forest.jpg')
}

function setup()
{
  let text = createP('color at mouse pos: ') 
  text.position(10, 780)
  colorLabel = createP('') 
 // colorLabel.position(10, 820)
  
  createCanvas(1024,768)

  colorPick = new ColorPick()

  dropzone = select('#dropzone')
  dropzone.dragOver(highlight)
  dropzone.dragLeave(unhighlight)
  dropzone.drop(gotFile, unhighlight)

} 

function gotFile(file) 
{
  createP(file.name + ' ' + file.size)
  img = createImg(file.data, 'invalid image file')
  //img.size(100, 100);
}

function highlight() 
{
  dropzone.style('background-color', '#ccc')
}

function unhighlight() 
{
  dropzone.style('background-color', '#fff')
}

function draw()
{
  background(255)
  image(img, 0, 0)

  colorPick.updateRender(true, 30) 
  colorLabel.html(colorPick.pointColor)
}

function mousePressed() {

}

function keyPressed() {

}





