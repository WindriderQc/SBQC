// Flock object
// Does very little, simply manages the array of all the boids

function Flock() {
  // An array for all the boids
    this.boids = []; // Initialize the array

  this.run = function(obstacles) {
    for (var i = 0; i < this.boids.length; i++) {
      this.boids[i].flock(this.boids, obstacles)// Passing the entire list of boids to each boid individually
      this.boids[i].run();  
    }
  }

  this.addBoid = function(b) {
    this.boids.push(b);
  }
}
