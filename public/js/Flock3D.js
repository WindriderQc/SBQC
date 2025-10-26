/**
 * Flock3D - Manages a collection of Boid3D instances
 * Adapted from Nature of Code flocking example for Three.js
 */

import Boid3D from './Boid3D.js';

export default class Flock3D {
    constructor(scene, earthRadius) {
        this.scene = scene;
        this.earthRadius = earthRadius;
        this.boids = [];
        
        // Flocking behavior weights (can be adjusted via UI)
        this.separationWeight = 1.5;
        this.alignmentWeight = 1.0;
        this.cohesionWeight = 1.0;
    }
    
    /**
     * Add a new boid to the flock at specified location
     */
    addBoid(lat, lon, altitude) {
        const boid = new Boid3D(lat, lon, altitude, this.scene, this.earthRadius);
        this.boids.push(boid);
        return boid;
    }
    
    /**
     * Add a boid at a random location around the Earth
     */
    addRandomBoid(altitude) {
        const lat = (Math.random() - 0.5) * 180;  // -90 to 90
        const lon = (Math.random() - 0.5) * 360;  // -180 to 180
        return this.addBoid(lat, lon, altitude);
    }
    
    /**
     * Initialize flock with a given number of boids
     */
    populate(count, altitude) {
        for (let i = 0; i < count; i++) {
            this.addRandomBoid(altitude);
        }
    }
    
    /**
     * Update all boids in the flock
     */
    update() {
        for (let boid of this.boids) {
            boid.flock(this.boids, this.separationWeight, this.alignmentWeight, this.cohesionWeight);
            boid.update();
        }
    }
    
    /**
     * Render all boids in the flock
     */
    render() {
        for (let boid of this.boids) {
            boid.render();
        }
    }
    
    /**
     * Run one complete update-render cycle
     */
    run() {
        this.update();
        this.render();
    }
    
    /**
     * Toggle trails for all boids
     */
    toggleTrails() {
        for (let boid of this.boids) {
            boid.toggleTrail();
        }
    }
    
    /**
     * Set the maximum speed for all boids
     */
    setMaxSpeed(speed) {
        for (let boid of this.boids) {
            boid.maxSpeed = speed;
        }
    }
    
    /**
     * Set the maximum force for all boids
     */
    setMaxForce(force) {
        for (let boid of this.boids) {
            boid.maxForce = force;
        }
    }
    
    /**
     * Update behavior weights for all boids
     */
    updateWeights(separation, alignment, cohesion) {
        this.separationWeight = separation;
        this.alignmentWeight = alignment;
        this.cohesionWeight = cohesion;
        
        // Note: In the current Boid3D implementation, weights are applied directly
        // in the flock() method. If we want dynamic weights, we'd need to pass them
        // or store them in each boid.
    }
    
    /**
     * Remove a specific boid from the flock
     */
    removeBoid(index) {
        if (index >= 0 && index < this.boids.length) {
            this.boids[index].dispose();
            this.boids.splice(index, 1);
        }
    }
    
    /**
     * Remove all boids from the flock
     */
    clear() {
        for (let boid of this.boids) {
            boid.dispose();
        }
        this.boids = [];
    }
    
    /**
     * Get the number of boids in the flock
     */
    getCount() {
        return this.boids.length;
    }
    
    /**
     * Clean up all resources
     */
    dispose() {
        this.clear();
    }
}
