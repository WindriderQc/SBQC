/// <reference types="p5/global" />

// TODO:  add disclaimer about localhost socket.io is required or implement secure on cloud server
let socket;
let messages;
let formChat;
let input;

const strokeWidth = 24

function setup() 
{ 
    let canvas = createCanvas(640, 480);
    canvas.parent('canvas'); // Set the parent of the canvas to the div with id 'canvas'
  
    
  
    background(150)

    messages = document.getElementById('messages');
    formChat = document.getElementById('formChat');
    input = document.getElementById('input');

    socket = io();


    formChat.addEventListener('submit', function(e) {
        e.preventDefault();
        if (input.value) {
          socket.emit('chat message', input.value);
          input.value = '';
        }
    });
      
    socket.on('chat message', function(msg) {
        let item = document.createElement('li');
        item.textContent = msg;
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });

    //socket = io.connect('localhost:3001')   // TODO:  convert to ejs..  pour recevoir l'api en param

    socket.on('mouse', alienDrawing)

    socket.on('iss', (data) => { console.log('ISS location:', data) })
} 

function draw() 
{ 
   
}

function mouseDragged() 
{

    let data = {
        x: mouseX, 
        y: mouseY
    }

    socket.emit('mouse', data)
    noStroke()
    fill(255)
    ellipse(mouseX, mouseY, strokeWidth, strokeWidth)
}

function alienDrawing(data) 
{
    noStroke()
    fill(255,0,100);
    ellipse(data.x, data.y, strokeWidth, strokeWidth)

}







 
          
