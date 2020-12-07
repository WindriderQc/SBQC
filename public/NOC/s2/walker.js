function Walker(x,y,m) {
  
    this.pos = createVector(x,y)
    this.vel = createVector(0, 0)
    this.acc = createVector(0, 0)
    this.color = color(0,0,0) 
    this.mass = m
    
    // Sets the color used in render()
    this.setColor = function(newColor) 
    {
        this.color = newColor
    }

    // Loop - Display Walker on canvas  
    this.render = function() 
    {
        stroke(this.color)
        fill(this.color)
        rect(this.pos.x, this.pos.y, 4, 4, 20);
    }

    // Physics engine algorithm
    this.update = function() 
    {    
        this.vel.add(this.acc)
        this.pos.add(this.vel)
        this.acc.mult(0)  // reset acceleration to avoid infinite acceleration
    }

    // physics application
    this.applyForce = function(force) 
    {
        var f = force.copy()
        f.div(this.mass)
        this.acc.add(f)
    }

    this.randomWalk = function() 
    {
        // Move Walker randomly
        var dir = createVector(random(-1, 1), random(-1, 1));
        dir.setMag(0.1)

        this.applyForce(dir);
    }

    // Loop - Apply force to accel toward a target position
    this.follow = function(pos, mag) 
    {
        // Vector pointing from Walker to OnScreen pos
        var accel = p5.Vector.sub(pos, this.pos)
        // Setting the magnitude of that vector
        accel.setMag(mag)

        this.applyForce(accel)
    }
           
    this.edges = function(isBounce) 
    {

        if(isBounce)
        {
            if(this.pos.x > width) {
                this.vel.x *= -1;
                this.pos.x = width;
            }
            else if(this.pos.x < 0){
                this.vel.x *= -1;
                this.pos.x = 0;
            }

            if(this.pos.y > height ) {
                this.vel.y *= -1;
                this.pos.y = height;
            } 
            else if(this.pos.y < 0 ) {
                this.vel.y *= -1;
                this.pos.y = 0;
            }
        }
        else {
            // Keep walker On Screen
            this.pos.x = constrain(this.pos.x, 0, width - 1);
            this.pos.y = constrain(this.pos.y, 0, height - 1);
        }
 
    }
  }