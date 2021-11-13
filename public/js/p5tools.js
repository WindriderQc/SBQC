
//   P5 Tools

function displayGrid(r,l, color = 0, weight = 1)   //  smallest weight = 1 pixel
{
  for (var x = -width/2; x < width/2; x += width / r) {
    for (var y = -height/2; y < height/2; y += height / l) {
      stroke(color);
      strokeWeight(weight);
      line(x, -height/2, x, height/2);
      line(-width /2, y, width/2, y);
    }
  }
}