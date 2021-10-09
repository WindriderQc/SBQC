
// Animal Constructor
// Methods for Separation, Cohesion, Alignment added

function Animal(x,y, m) {

    this.acceleration = createVector(0, 0);
    this.velocity = createVector(0,0);
    this.position = createVector(x, y);
    this.r = 3.0;
    this.maxspeed = 2; // Maximum speed
    this.maxforce = 0.2; // Maximum steering force
    this.color = color(200, 200, 200) 
    this.mass = m
  

    // create basic colors
    this.yellow = color(255, 204, 0)
    this.red = color(255, 0, 0)
    this.green = color(0, 255, 0)


    /*///////////////////////////////////////
    //   Generic physic objects method     //
    ///////////////////////////////////////*/

    // Sets the initial velocity
    this.setVelocity = function(x, y)   
    {
        this.velocity = createVector(x, y);
    } 
    // Sets the color used in render()  
    this.setColor = function(newColor) 
    {
        this.color = newColor
    }
    // physics application
    this.applyForce = function(force) 
    {
        var f = force.copy()
        f.div(this.mass)
        this.acceleration.add(f)
    }
    // Physics engine algorithm
    this.update = function() 
    {
        this.velocity.add(this.acceleration) // Update velocity  
        this.velocity.limit(this.maxspeed) // Limit speed
        this.position.add(this.velocity)
        this.acceleration.mult(0)   // Reset accelertion to 0 each cycle
    }
    // Wraparound
    this.borders = function() 
    {
      if (this.position.x < -this.r) this.position.x = width + this.r;
      if (this.position.y < -this.r) this.position.y = height + this.r;
      if (this.position.x > width + this.r) this.position.x = -this.r;
      if (this.position.y > height + this.r) this.position.y = -this.r;
    }
    
    // Display Screen representation 
    this.render = function() 
    {
      // Draw a triangle rotated in the direction of velocity
      var theta = this.velocity.heading() + radians(90);
      fill(127);
      stroke(this.color);
      push();
      translate(this.position.x, this.position.y);
      rotate(theta);
      beginShape();
      vertex(0, -this.r * 2);
      vertex(-this.r, this.r * 2);
      vertex(this.r, this.r * 2);
      endShape(CLOSE);
      pop();
    }

    // Main Loop method 
    this.run = function() 
    {
        this.update();
        this.borders();
        this.render();
    }

 


    ///////////////////////////////////////
    //   Beahaviors                        
    //
    //  STEER = DESIRED MINUS VELOCITY
    ///////////////////////////////////////
    
    // Seek
    // method that calculates and applies a steering force towards a target
    this.seek = function(target) 
    {
      var desired = p5.Vector.sub(target, this.pos);
  
      // The seek behavior!
      desired.setMag(this.maxspeed);
  
      // Steering formula
      var steering = p5.Vector.sub(desired, this.vel);
      steering.limit(this.maxforce);
      this.applyForce(steering);
  
    }



    // Separation
    // Method checks for nearby boids and steers away
    this.separate = function(boids) 
    {
      var desiredseparation = 25.0;
      var steer = createVector(0, 0);
      var count = 0;
      // For every boid in the system, check if it's too close
      for (var i = 0; i < boids.length; i++) {
        var d = p5.Vector.dist(this.position, boids[i].position);
        // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
        if ((d > 0) && (d < desiredseparation)) {
          // Calculate vector pointing away from neighbor
          var diff = p5.Vector.sub(this.position, boids[i].position);
          diff.normalize();
          diff.div(d); // Weight by distance
          steer.add(diff);
          count++; // Keep track of how many
        }
      }
      // Average -- divide by how many
      if (count > 0) {
        steer.div(count);
      }

      // As long as the vector is greater than 0
      if (steer.mag() > 0) {
        // Implement Reynolds: Steering = Desired - Velocity
        steer.normalize();
        steer.mult(this.maxspeed);
        steer.sub(this.velocity);
        steer.limit(this.maxforce);
      }
      return steer;
    }

    // Alignment
    // For every nearby boid in the system, calculate the average velocity
    this.align = function(boids) 
    {
      var neighbordist = 50;
      var sum = createVector(0, 0);
      var count = 0;
      for (var i = 0; i < boids.length; i++) {
        var d = p5.Vector.dist(this.position, boids[i].position);
        if ((d > 0) && (d < neighbordist)) {
          sum.add(boids[i].velocity);
          count++;
        }
      }
      if (count > 0) {
        sum.div(count);
        sum.normalize();
        sum.mult(this.maxspeed);
        var steer = p5.Vector.sub(sum, this.velocity);
        steer.limit(this.maxforce);
        return steer;
      } else {
        return createVector(0, 0);
      }
    }

    // Cohesion
    // For the average location (i.e. center) of all nearby boids, calculate steering vector towards that location
    this.cohesion = function(boids) 
    {
      var neighbordist = 50;
      var sum = createVector(0, 0); // Start with empty vector to accumulate all locations
      var count = 0;
      for (var i = 0; i < boids.length; i++) {
        var d = p5.Vector.dist(this.position, boids[i].position);
        if ((d > 0) && (d < neighbordist)) {
          sum.add(boids[i].position); // Add location
          count++;
        }
      }
      if (count > 0) {
        sum.div(count);
        return this.seek(sum); // Steer towards the location
      } else {
        return createVector(0, 0);
      }
    }
}