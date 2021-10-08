// Boid Constructor
// Methods for Separation, Cohesion, Alignment added


class Boid {
  constructor(x, y, m, velX, velY, ms, mf, img) 
  {
    this.acceleration = createVector(0, 0)
    this.velocity = createVector(velX, velY)
    this.position = createVector(x, y)
    this.r = 4.0
    this.maxspeed = ms || 3;    // Maximum speed
    this.maxforce = mf || 0.05 // Maximum steering force
    this.fillColor = color(200, 200, 200) 
    this.mass = m

    this.image = img

    // trails
    this.activeTrail = false
    this.trail = []
    this.no = 0

    // create basic colors    //  TODO : a pas rapport ici
    this.yellow = color(255, 204, 0)
    this.red = color(255, 0, 0)
    this.green = color(0, 255, 0)


    // TODO: faire un object avec le trail
    this.isTrailCut = false
    this.trailcut = []
    this.trailCutCountdown = 0
  }


  // Sets the initial velocity
  /*setVelocity(x, y) 
  {
      this.velocity = createVector(x, y)
  } */

  // Sets the color used in render()  
  setColor(newColor) 
  {
      this.fillColor = newColor
  }

  // physics application
  applyForce(force) 
  {
      let f = force.copy()
      f.div(this.mass)
      this.acceleration.add(f)
  }

  // combines action for ease of use
  run(withBorders) 
  {
    this.update();
    if(withBorders) this.borders();
    this.render();
  }




  // Display 
  render() 
  {
    // Draw a triangle rotated in the direction of velocity
    let theta = this.velocity.heading() + radians(90);  // + PI/2

    // trails
    if(this.activeTrail)
    {
      stroke(200)
      strokeWeight(1)
      noFill()
      
      if(this.isTrailCut) 
      {
        this.isTrailCut = false  // reset edge detect flag
        this.trailcut = this.trail  // copy actual trail as the cut part
        this.trail = []  // reset activetrail so it rebirth on other edge
      }

      if(this.trailcut.length > 0) {
        beginShape();
        for(let i = 0; i < this.trailcut.length; i++){
          vertex(this.trailcut[i].x, this.trailcut[i].y);
        }
        endShape();
        this.trailcut.shift()   // remove last trailcut element 1 by 1 until trailcut.length = 0 
      }

      beginShape();
      for(let i = 0; i < this.trail.length; i++){
        vertex(this.trail[i].x, this.trail[i].y);
        //ellipse(this.trail[i].x, this.trail[i].y,1,2);
        //console.log(this.trail[i].x + " -- " + this.trail[i].y);
      }
      endShape();
    }
    // end trails 
    

    fill(this.fillColor);  //  Use the object configured color
    stroke(200);
    push();
    translate(this.position.x, this.position.y);
    rotate(theta);

    if(this.image) {  //  render the image at boid position
      image(this.image, 20,20, 40,40);
    } 
    else{           //  or simply draw the triangle boid if no image provided
        beginShape();
        vertex(0, -this.r * 2);
        vertex(-this.r, this.r * 2);
        vertex(this.r, this.r * 2);
        endShape(CLOSE);
    }

    pop();
  }

  // Wraparound
  borders() 
  {
    //detect is object reaches edge, considering its size, and translate position to other edge
    if (this.position.x < -this.r) { this.position.x = width + this.r;  this.isTrailCut = true }
    if (this.position.y < -this.r) { this.position.y = height + this.r; this.isTrailCut = true }
    if (this.position.x > width + this.r)  { this.position.x = -this.r; this.isTrailCut = true }
    if (this.position.y > height + this.r) { this.position.y = -this.r; this.isTrailCut = true }
  }

  bordersPath(p) 
  {
    if (this.position.x > p.getEnd().x + this.r) {
      this.position.x = p.getStart().x - this.r;
      this.position.y = p.getStart().y + (this.position.y - p.getEnd().y);
    }
  }

   // Wraparound
   bordersBounce() 
   {
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

/*
  this.seekTargetGroup = function(boids, target)
  {
      let seperateForce = Separate(boids);
      let seekForce = Seek(target);
      seperateForce *= 2;
      seekForce *= 1;
      ApplyForce(seperateForce);
      ApplyForce(seekForce);
  }*/

 
  // We accumulate a new acceleration each time based on three rules
  flock(boids, obstacles) 
  {

    let sep = this.separate(boids); // Separation
    let ali = this.align(boids);    // Alignment
    let coh = this.cohesion(boids); // Cohesion
    
    // Arbitrarily weight these forces
    sep.mult(1) //separationSlider.value());
    ali.mult(3) //alignmentSlider.value());
    coh.mult(1) //cohesionSlider.value());

    if(obstacles){
      let avoid = this.separate(obstacles); 
      avoid.mult(15)
      this.applyForce(avoid)
    }
    
    
    // Add the force vectors to acceleration
    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);

    
  }

  // Method to update location
  update() 
  {

    /*
     let nx = map(noise(this.no,0,1,-10,10));
      let noiseVec = createVector(sin(noise(nx)),cos(noise(nx)));
      this.acc.add(noiseVec);
      */

    // Update velocity
    this.velocity.add(this.acceleration);
    // Limit speed
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    // Reset accelertion to 0 each cycle
    this.acceleration.mult(0);


    // trails
    if(this.activeTrail)
    {
      let f = this.position.copy();
        this.trail.push(f);
        if(this.trail.length > 45){
          this.trail.splice(0,1)
        }
        
        this.no += 0.01;
    }
    /////

  }


  gravity()
  {
     // Gravity is scaled by mass here!
     var gravity = createVector(0, 0.1 * this.mass)
     // Apply gravity
     this.applyForce(gravity)
  }


  /*************************
   * Behaviors
   * 
   * STEER = DESIRED MINUS VELOCITY
   * 
   *************************/

  // Seek
  // A method that calculates and applies a steering force towards a target
  seek(target) 
  {
    let desired = p5.Vector.sub(target, this.position); // A vector pointing from the location to the target
    
    // Normalize desired and scale to maximum speed
    desired.normalize();
    desired.mult(this.maxspeed);

    // Steering = Desired - Velocity
    let steering = p5.Vector.sub(desired, this.velocity);
    steering.limit(this.maxforce); // Limit to maximum steering force
    return steering;
  }

  // Arrive
  // Method to slow down when arriving top a target
  arrive(target, arrivalDistance) 
  {
    let desired = p5.Vector.sub(target, this.position);
  
    // The arrive behavior!
    let d = desired.mag();
    if (d < arrivalDistance) {
      // Map the desired magnitude according to distance
      let m = map(d, 0, arrivalDistance, 0, this.maxspeed);
      desired.setMag(m);
    } else {
      desired.setMag(this.maxspeed);
    }


    let steering = p5.Vector.sub(desired, this.velocity);
    steering.limit(this.maxforce);

    return(steering)
  }

  // Separation
  // Method checks for nearby boids and steers away
  separate(boids) 
  {
    let desiredseparation = 10 * this.r;
    let steer = createVector(0, 0);
    let count = 0;
    // For every boid in the system, check if it's too close
    for (let i = 0; i < boids.length; i++) {
      let d = p5.Vector.dist(this.position, boids[i].position);
      // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
      if ((d > 0) && (d < desiredseparation)) {
        // Calculate vector pointing away from neighbor
        let diff = p5.Vector.sub(this.position, boids[i].position);
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
  align(boids) 
  {
    let neighbordist = 50;
    let sum = createVector(0, 0);
    let count = 0;
    for (let i = 0; i < boids.length; i++) {
      let d = p5.Vector.dist(this.position, boids[i].position);
      if ((d > 0) && (d < neighbordist)) {
        sum.add(boids[i].velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxspeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxforce);
      return steer;
    } else {
      return createVector(0, 0);
    }
  }

  // Cohesion
  // For the average location (i.e. center) of all nearby boids, calculate steering vector towards that location
  cohesion(boids) 
  {
    let neighbordist = 50;
    let sum = createVector(0, 0); // Start with empty vector to accumulate all locations
    let count = 0;
    for (let i = 0; i < boids.length; i++) {
      let d = p5.Vector.dist(this.position, boids[i].position);
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



   // Implementing Reynolds' flow field following algorithm
  // http://www.red3d.com/cwr/steer/FlowFollow.html
  followField(flow) 
  {
    // What is the vector at that spot in the flow field?
    let desired = flow.lookup(this.position);
    // Scale it up by maxspeed
    desired.mult(this.maxspeed);
    // Steering is desired minus velocity
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxforce); // Limit to maximum steering force
    this.applyForce(steer);
  }



  // This function implements Craig Reynolds' path following algorithm
  // http://www.red3d.com/cwr/steer/PathFollow.html
  followPath(path) 
  {
    // Predict location 50 (arbitrary choice) frames ahead
    // This could be based on speed
    let predict = this.velocity.copy();
    predict.normalize();
    predict.mult(50);
    let predictLoc = p5.Vector.add(this.position, predict);

    // Now we must find the normal to the path from the predicted location
    // We look at the normal for each line segment and pick out the closest one

    let normal = null;
    let target = null;
    let worldRecord = 1000000; // Start with a very high record distance that can easily be beaten

    // Loop through all points of the path
    for (let i = 0; i < path.points.length - 1; i++) {

      // Look at a line segment
      let a = path.points[i];
      let b = path.points[i + 1];

      // Get the normal point to that line
      let normalPoint = getNormalPoint(predictLoc, a, b);
      // This only works because we know our path goes from left to right
      // We could have a more sophisticated test to tell if the point is in the line segment or not
      if (normalPoint.x < a.x || normalPoint.x > b.x) {
        // This is something of a hacky solution, but if it's not within the line segment
        // consider the normal to just be the end of the line segment (point b)
        normalPoint = b.copy();
      }

      // How far away are we from the path?
      let distance = p5.Vector.dist(predictLoc, normalPoint);
      // Did we beat the record and find the closest line segment?
      if (distance < worldRecord) {
        worldRecord = distance;
        // If so the target we want to steer towards is the normal
        normal = normalPoint;

        // Look at the direction of the line segment so we can seek a little bit ahead of the normal
        let dir = p5.Vector.sub(b, a);
        dir.normalize();
        // This is an oversimplification
        // Should be based on distance to path & velocity
        dir.mult(10);
        target = normalPoint.copy();
        target.add(dir);
      }
    }

    // Only if the distance is greater than the path's radius do we bother to steer
    if (worldRecord > path.radius && target !== null) {
      //console.log(target)
      //this.arrive(target);
      let seekForce = this.seek(target);
      this.applyForce(seekForce);
    }

    // Draw the debugging stuff
    if (debug) {
      // Draw predicted future location
      stroke(255);
      fill(200);
      line(this.position.x, this.position.y, predictLoc.x, predictLoc.y);
      ellipse(predictLoc.x, predictLoc.y, 4, 4);

      // Draw normal location
      stroke(255);
      fill(200);
      ellipse(normal.x, normal.y, 4, 4);
      // Draw actual target (red if steering towards it)
      line(predictLoc.x, predictLoc.y, normal.x, normal.y);
      if (worldRecord > path.radius) fill(255, 0, 0);
      noStroke();
      ellipse(target.x, target.y, 8, 8);
    }
  }


}