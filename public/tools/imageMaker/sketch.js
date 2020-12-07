let y = 200;

function setup() { 
  createCanvas(50, 50);
  stroke(75);
  strokeWeight(2)
  frameRate(2);
  
} 

function draw() { 
   
  
  if (y == 0){
    fill(15, 255, 15);
    y = y + 200;
  }
  
  else if (y == 200){
    fill(75);
    y = y - 200;
  }
  
  
  ellipse(25, 25, 25, 25);
}

function mouseClicked() {
  saveCanvas('myCanvas', 'png');
}