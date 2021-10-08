// Non Living basic object

function NonLiving(x, y, m, velX, velY) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(velX, velY);
    this.position = createVector(x, y);
    this.r = 3.0;
    this.maxspeed = 3; // Maximum speed
    this.maxforce = 0.05; // Maximum steering force
    this.fillColor = color(200, 200, 200) 
    this.mass = m
    
    // Sets the initial velocity
    this.setVelocity = function(x, y) {
        this.velocity = createVector(x, y)
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

    this.gravity = function()
    {
       // Gravity is scaled by mass here!
       var gravity = createVector(0, 0.1 * this.mass)
       // Apply gravity
       this.applyForce(gravity)
    }

    this.run = function() {

     // this.gravity()
      this.update()
     // this.borders()
      this.edgeBounce()
      this.render()
    }
  
  
    
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
  
    // Visual representation
    this.render = function() {
      fill(this.fillColor);
      stroke(200);
      ellipse(this.position.x, this.position.y, this.r*2, this.r*2);
    };
  
    // Wraparound
    this.edgeBounce = function() {
      if (this.position.x < -this.r) {
        this.velocity.x *= -1;
        this.position.x = this.r
      } 
      if (this.position.y < -this.r) {
        this.velocity.y *= -1;
        this.position.y = this.position.y
      } 
      if (this.position.x > width + this.r){
        this.velocity.x *= -1;
        this.position.x = width + this.r
      } 
      if (this.position.y > height + this.r){
        this.velocity.y *= -1;
        this.position.y = height + this.r
      } 
    }

      // Wraparound
    this.borders = function() {
      if (this.position.x < -this.r) this.position.x = width + this.r;
      if (this.position.y < -this.r) this.position.y = height + this.r;
      if (this.position.x > width + this.r) this.position.x = -this.r;
      if (this.position.y > height + this.r) this.position.y = -this.r;
    }
  
  }