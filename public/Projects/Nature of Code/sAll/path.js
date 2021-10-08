// Path Following

function Path() 
{
    // A path has a radius, i.e how far is it ok for the boid to wander off
    this.radius = 20;
    // A Path is an array of points (p5.Vector objects)
    this.points = [];
    

    // Add a point to the path
    this.addPoint = function(x, y) 
    {
        var point = createVector(x, y);
        this.points.push(point);
    }


    this.getStart = function() 
    {
        return this.points[0];
    }


    this.getEnd = function() 
    {
        return this.points[this.points.length - 1];
    }
    

    // Draw the path
    this.display = function() 
    {
        // Draw thick line for radius
        stroke(99);
        strokeWeight(this.radius * 2);
        noFill();
        beginShape();
        for (var i = 0; i < this.points.length; i++) {
          vertex(this.points[i].x, this.points[i].y);
        }
        endShape();
        // Draw thin line for center of path
        stroke(255);
        strokeWeight(1);
        noFill();
        beginShape();
        for (var i = 0; i < this.points.length; i++) {
          vertex(this.points[i].x, this.points[i].y);
        }
        endShape();
      }

}



// A function to get the normal point from a point (p) to a line segment (a-b)
// This function could be optimized to make fewer new Vector objects
function getNormalPoint(p, a, b) 
{
    // Vector from a to p
    var ap = p5.Vector.sub(p, a);
    // Vector from a to b
    var ab = p5.Vector.sub(b, a);
    ab.normalize(); // Normalize the line
    // Project vector "diff" onto line by using the dot product
    ab.mult(ap.dot(ab));
    var normalPoint = p5.Vector.add(a, ab);
    return normalPoint;
}