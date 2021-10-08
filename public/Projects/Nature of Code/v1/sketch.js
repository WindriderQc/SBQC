let green1, green2, beige1, beige2, brick

function setup() 
{
  createCanvas(1024, 768)
  
  green1 = color(98,164,140)
  green2 = color(90,143,115)
  greenDark = color(60,72,58)
  beige1 = color(241,225,210)
  beige2 = color(220,205,178)
  brick = color(190,195,181)
}

function draw() 
{
  background(24, 17, 10)
  
  // dark bushes
  stroke(greenDark)
  fill(greenDark)
  triangle(475,500, 1000, 500, 820, 10);
  triangle(520,500, 1000, 500, 1024, 0);
  
  // green bushes
  stroke(green1)
  fill(green1)
  triangle(850,240,1024,20,1024,500)
  stroke(green2)
  fill(green2)
  triangle(850,280,1024,70,1024,550)
  triangle(858,60,1150,768,400,768)
  stroke(green1)
  fill(green1)
  ellipse(875,600,325,700)
  triangle(875,100,960,315,780,315)
 
  
  // Front bushes
  stroke(beige2)
  fill(beige2)
  ellipse(875,570,185,575)
  triangle(875,215,935,350,815,350)

  stroke(beige1)
  fill(beige1)
  ellipse(930,570,170,575)
  triangle(930,180,985,350,875,350)
  

  // house
  fill(brick)
  rect(0,0,666,768)
  
  
  // windows
  stroke(beige1)
  fill(beige1)
  rect(95,105,90,120)
  rect(310,105,65,140)
  rect(485,105,55,125)
  
  rect(95,400,90,120)
  rect(310,380,65,160)
  rect(485,385,55,160)
  
  rect(95,675,90,120)
  rect(310,655,65,140)
  rect(485,655,50,125)
  
  
  //  Roofs
  stroke(green1)
  fill(green1)
  triangle(135,8,50,115, 224,110)
  stroke(green2)
  fill(green2)
  triangle(310,-10,271,100, 410,105)
  stroke(green1)
  fill(green1)
  triangle(510,20,430,100, 600,105)
  
  stroke(green1)
  fill(green1)
  triangle(135,290,50,395, 235,400)
  stroke(green2)
  fill(green2)
  triangle(365,274,265,380, 431,380)
  stroke(green1)
  fill(green1)
  triangle(500,265,450,385, 600,385)
  
  stroke(green1)
  fill(green1)
  triangle(165,550,50,675, 224,675)
  stroke(green2)
  fill(green2)
  triangle(320,538,265,665, 431,665)
  stroke(green1)
  fill(green1)
  triangle(500,544,450,665, 600,665)
}

