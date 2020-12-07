function Particle(x,y,mass, initVelocityX, initVelocityY)  {
   
    this.pos = createVector(x,y)
    this.vel = createVector(initVelocityX, initVelocityY)
    this.acc = createVector(0, 0)
    this.color = color(0,0,0) 
    this.mass = mass


    // physics application
    this.applyForce = function(force) {
        var f = force.copy()
        f.div(this.mass)
        this.acc.add(f)
    }
      
    // Sets the color used in render()  
    this.setColor = function(newColor) {
          this.color = newColor
    }
  
    // Loop - Display Walker on canvas  
    this.render = function() 
    {
        stroke(this.color)
        strokeWeight(2);
        fill(25, 127)
        ellipse(this.pos.x, this.pos.y, this.mass*16, this.mass*16);
    }
      
    // loop - insure particles stays on screen
    this.edges = function() 
    {
        if(this.pos.y > height) {
            this.vel.y *= -1;
            this.pos.y = height;
        }

        if(this.pos.x > width) {
        this.vel.x *= -1;
        this.pos.x = width;
        }
    }

    // Physics engine algorithm
    this.update = function() 
    {  
        this.vel.add(this.acc)
        this.pos.add(this.vel)
        this.acc.mult(0)  // reset acceleration to avoid infinite acceleration
    }
}