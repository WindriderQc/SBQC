export default class Starfield {
    /**
     * Creates a 3D starfield.
     * @param {object} p - The p5.js instance.
     * @param {number} numStars - The number of stars to generate.
     * @param {number} radius - The radius of the sphere on which stars will be generated.
     */
    constructor(p, numStars = 500, radius = 3000) {
        this.p = p;
        this.stars = [];
        for (let i = 0; i < numStars; i++) {
            // Create a random vector, normalize it to get a point on a sphere, then scale it to a random distance
            this.stars.push(this.p.createVector(this.p.random(-1, 1), this.p.random(-1, 1), this.p.random(-1, 1)).normalize().mult(this.p.random(radius * 0.8, radius)));
        }
    }

    /**
     * Renders the starfield.
     */
    draw() {
        this.p.push();
        this.p.noStroke();
        this.p.fill(255);
        for (const star of this.stars) {
            this.p.push();
            this.p.translate(star.x, star.y, star.z);
            this.p.sphere(2); // Draw each star as a small sphere
            this.p.pop();
        }
        this.p.pop();
    }
}