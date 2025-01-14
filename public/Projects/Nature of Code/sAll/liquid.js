// Daniel Shiffman
// http://natureofcode.com/
// Session 2: Drag Force

class Liquid {
    constructor(x, y, w, h, c) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.c = c;
    }


    // Is the Mover in the Liquid?
    contains(m) 
    {
      var l = m.position;
      return l.x > this.x && l.x < this.x + this.w &&
            l.y > this.y && l.y < this.y + this.h;
    }

    // Calculate drag force
    calculateDrag(m) 
    {
      // Magnitude is coefficient * speed squared
      var speed = m.velocity.mag();
      var dragMagnitude = this.c * speed * speed;

      // Direction is inverse of velocity
      var dragForce = m.velocity.copy();
      dragForce.mult(-1);

      // Scale according to magnitude
      dragForce.setMag(dragMagnitude);
      return dragForce;
    }

    display() 
    {
      noStroke();
      fill(50);
      rect(this.x, this.y, this.w, this.h);
    }
}
