/// <reference path="../p5.global-mode.d.ts" />

let socket;

function setup() 
{ 
    createCanvas(640, 480);
  
    background(150)
    socket = io.connect('http://localhost:3001')

    socket.on('mouse', alienDrawing)

    socket.on('iss', (data) => { console.log(data) })
} 

function draw() 
{ 
   

}

function mouseDragged() 
{

    var data = {
        x: mouseX, 
        y: mouseY
    }

    socket.emit('mouse', data)

    noStroke()
    fill(255)
    ellipse(mouseX, mouseY, 36, 36)
}

function alienDrawing(data) 
{
    noStroke()
    fill(255,0,100);
    ellipse(data.x, data.y, 36, 36)

}