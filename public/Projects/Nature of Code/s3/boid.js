// Boid Constructor
// Methods for Separation, Cohesion, Alignment added

function Boid(x, y, m, velX, velY) {
  this.acceleration = createVector(0, 0);
  this.velocity = createVector(velX, velY);
  this.position = createVector(x, y);
  this.r = 3.0;
  this.maxspeed = 3; // Maximum speed
  this.maxforce = 0.05; // Maximum steering force
  this.fillColor = color(200, 200, 200) 
  this.mass = m


  // create basic colors
  this.yellow = color(255, 204, 0)
  this.red = color(255, 0, 0)
  this.green = color(0, 255, 0)

  // Sets the initial velocity
  this.setVelocity = function(x, y) {
      this.velocity = createVector(x, y);
  } 

  // Sets the color used in render()  
  this.setColor = function(newColor) {
      this.fillColor = newColor
  }

  // physics application
  this.applyForce = function(force) 
  {
      var f = force.copy()
      f.div(this.mass)
      this.acceleration.add(f)
  }

  // combines action for ease of use
  this.run = function() {
    this.update();
    this.borders();
    this.render();
  }

 // Display 
 this.render = function() {
  // Draw a triangle rotated in the direction of velocity
  var theta = this.velocity.heading() + radians(90);
  fill(this.fillColor);  //  Use the object configured color
  stroke(200);
  push();
  translate(this.position.x, this.position.y);
  rotate(theta);
  beginShape();
  vertex(0, -this.r * 2);
  vertex(-this.r, this.r * 2);
  vertex(this.r, this.r * 2);
  endShape(CLOSE);
  pop();
};

// Wraparound
this.borders = function() {
  if (this.position.x < -this.r) this.position.x = width + this.r;
  if (this.position.y < -this.r) this.position.y = height + this.r;
  if (this.position.x > width + this.r) this.position.x = -this.r;
  if (this.position.y > height + this.r) this.position.y = -this.r;
}

  // We accumulate a new acceleration each time based on three rules
  this.flock = function(boids, obstacles) {

    var sep = this.separate(boids); // Separation
    var ali = this.align(boids);    // Alignment
    var coh = this.cohesion(boids); // Cohesion
    
    // Arbitrarily weight these forces
    sep.mult(1) //separationSlider.value());
    ali.mult(3) //alignmentSlider.value());
    coh.mult(1) //cohesionSlider.value());

    if(obstacles){
      var avoid = this.separate(obstacles); 
      avoid.mult(15)
      this.applyForce(avoid)
    }
    
    
    // Add the force vectors to acceleration
    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);

    
  };

  // Method to update location
  this.update = function() {
    // Update velocity
    this.velocity.add(this.acceleration);
    // Limit speed
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    // Reset accelertion to 0 each cycle
    this.acceleration.mult(0);
  };



  /*************************
   * Behaviors
   * 
   * STEER = DESIRED MINUS VELOCITY
   * 
   *************************/

  // Seek
  // A method that calculates and applies a steering force towards a target
  this.seek = function(target) {
    var desired = p5.Vector.sub(target, this.position); // A vector pointing from the location to the target
    // Normalize desired and scale to maximum speed
    desired.normalize();
    desired.mult(this.maxspeed);
    // Steering = Desired - Velocity
    var steering = p5.Vector.sub(desired, this.velocity);
    steering.limit(this.maxforce); // Limit to maximum steering force
    return steering;
  };

  // Arrive
  // Method to slow down when arriving top a target
  this.arrive = function(target, arrivalDistance) 
  {

    var desired = p5.Vector.sub(target, this.position);
  
    // The arrive behavior!
    var d = desired.mag();
  
    if (d < arrivalDistance) {
      // Map the desired magnitude according to distance
      var m = map(d, 0, arrivalDistance, 0, this.maxspeed);
      desired.setMag(m);
    } else {
      desired.setMag(this.maxspeed);
    }


    var steering = p5.Vector.sub(desired, this.velocity);
    steering.limit(this.maxforce);

    return(steering)
  }

  // Separation
  // Method checks for nearby boids and steers away
  this.separate = function(boids) {
    var desiredseparation = 10 * this.r;
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
  this.align = function(boids) {
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
  this.cohesion = function(boids) {
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