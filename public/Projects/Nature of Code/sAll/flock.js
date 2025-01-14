// Flock object
// Does very little, simply manages the array of all the boids

class Flock {
  constructor() {
  // An array for all members of the Flock
    this.boids = []; 
  }
  

  run( obstacles) 
  {
    for (let i = 0; i < this.boids.length; i++) {
      this.boids[i].flock(this.boids, obstacles)// Passing the entire list of boids to each boid individually

      this.boids[i].run(true);   
    }
  }

  addBoid(b)
  {
    this.boids.push(b);
  }

}
