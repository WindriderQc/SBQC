  //    WALKER
  function Walker() {
  
    // Start Walker in center with 0 velocity
    this.pos = createVector(width / 2, height / 8)
    this.vel = createVector(0, 0)
    this.acc = createVector(0, 0)
    this.color = color(0,0,0) // 
    
    // Sets the color used in render()
    this.setColor = function(newColor) {
        this.color = newColor
    }
    // Loop - Display Walker on canvas  
    this.render = function() {
        stroke(this.color)
        fill(this.color)
        rect(this.pos.x, this.pos.y, 3, 3, 20);
    }
    
    // Loop - Actualize Walker position chasing a random ghost position.
    this.update = function() 
    {
        // Vector at random OnScreen location
        var scrpos = createVector(floor(random(0,width)), floor(random(0, height)))
        // Vector pointing from Walker to OnScreen pos
        this.acc = p5.Vector.sub(scrpos, this.pos);
        // Setting the magnitude of that vector
        this.acc.setMag(0.4);
         // Physics engine algorithm
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        // Keep walker On Screen
        this.pos.x = constrain(this.pos.x, 0, width - 1);
        this.pos.y = constrain(this.pos.y, 0, height - 1);
    }
  }