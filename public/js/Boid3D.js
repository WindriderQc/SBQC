/**
 * Boid3D - Three.js implementation of flocking behavior in 3D space
 * Adapted from Nature of Code p5.js flocking example
 * Positions boids in orbit around Earth sphere using spherical coordinates
 */

// Access THREE from global scope (loaded via script tag)
const THREE = window.THREE;

export default class Boid3D {
    constructor(lat, lon, altitude, scene, earthRadius) {
        this.scene = scene;
        this.earthRadius = earthRadius;
        
        // Convert lat/lon/altitude to 3D position
        this.lat = lat;
        this.lon = lon;
        this.altitude = altitude; // altitude above earth surface in scene units
        
        // Three.js vectors for position, velocity, acceleration
        this.position = this.latLonToVector3(lat, lon, altitude);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );
        this.acceleration = new THREE.Vector3(0, 0, 0);
        
        // Flocking parameters
        this.maxSpeed = 0.05;
        this.maxForce = 0.002;
        this.size = 0.02; // Much smaller size for boids
        
        // Visual properties
        this.color = new THREE.Color(0x00aaff);
        
        // Create visual representation
        this.createMesh();
        
        // Trail support
        this.trail = [];
        this.maxTrailLength = 30;
        this.showTrail = false;
        this.trailLine = null;
    }
    
    /**
     * Convert spherical coordinates (lat, lon, altitude) to Cartesian (x, y, z)
     * Similar to getSphereCoord but using Three.js conventions
     */
    latLonToVector3(lat, lon, altitude) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const radius = this.earthRadius + altitude;
        
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        
        return new THREE.Vector3(x, y, z);
    }
    
    /**
     * Convert Cartesian position back to lat/lon/altitude
     */
    vector3ToLatLon(position) {
        const radius = position.length();
        const altitude = radius - this.earthRadius;
        
        const lat = 90 - (Math.acos(position.y / radius) * 180 / Math.PI);
        let lon = (Math.atan2(position.z, -position.x) * 180 / Math.PI) - 180;
        
        // Normalize longitude to -180 to 180
        while (lon < -180) lon += 360;
        while (lon > 180) lon -= 360;
        
        return { lat, lon, altitude };
    }
    
    /**
     * Create the visual mesh for this boid
     */
    createMesh() {
        const geometry = new THREE.ConeGeometry(this.size * 0.5, this.size * 2, 8);
        const material = new THREE.MeshPhongMaterial({ 
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }
    
    /**
     * Apply a force to the boid
     */
    applyForce(force) {
        this.acceleration.add(force);
    }
    
    /**
     * Main flocking behavior - combines separation, alignment, and cohesion
     */
    flock(boids, separationWeight = 1.5, alignmentWeight = 1.0, cohesionWeight = 1.0) {
        const separation = this.separate(boids);
        const alignment = this.align(boids);
        const cohesion = this.cohesion(boids);
        
        // Weight the forces with parameters
        separation.multiplyScalar(separationWeight);
        alignment.multiplyScalar(alignmentWeight);
        cohesion.multiplyScalar(cohesionWeight);
        
        // Apply forces
        this.applyForce(separation);
        this.applyForce(alignment);
        this.applyForce(cohesion);
    }
    
    /**
     * Update position based on velocity and acceleration
     */
    update() {
        // Update velocity
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        
        // Update position
        this.position.add(this.velocity);
        
        // Constrain to orbital sphere - normalize and set to correct radius
        const targetRadius = this.earthRadius + this.altitude;
        this.position.normalize().multiplyScalar(targetRadius);
        
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
        
        // Update trail
        if (this.showTrail) {
            this.trail.push(this.position.clone());
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
    }
    
    /**
     * Render the boid and its trail
     */
    render() {
        // Update mesh position
        this.mesh.position.copy(this.position);
        
        // Orient mesh in direction of movement
        if (this.velocity.length() > 0.001) {
            // The cone should point in the direction of velocity
            const direction = this.velocity.clone().normalize();
            
            // Calculate the target point the cone should point at
            const target = this.position.clone().add(direction);
            
            // Up vector points radially away from Earth (perpendicular to surface)
            const up = this.position.clone().normalize();
            
            // Make the cone look at the target point
            this.mesh.lookAt(target);
            
            // Rotate 90 degrees because cone's default orientation is Y-up
            this.mesh.rotateX(Math.PI / 2);
        }
        
        // Update trail if visible
        if (this.showTrail && this.trail.length > 1) {
            if (this.trailLine) {
                this.scene.remove(this.trailLine);
            }
            
            const trailGeometry = new THREE.BufferGeometry().setFromPoints(this.trail);
            const trailMaterial = new THREE.LineBasicMaterial({ 
                color: this.color,
                opacity: 0.5,
                transparent: true
            });
            this.trailLine = new THREE.Line(trailGeometry, trailMaterial);
            this.scene.add(this.trailLine);
        } else if (this.trailLine) {
            this.scene.remove(this.trailLine);
            this.trailLine = null;
        }
    }
    
    /**
     * Separation - steer to avoid crowding local flockmates
     */
    separate(boids) {
        const desiredSeparation = 0.15; // Adjusted for smaller scale
        const steer = new THREE.Vector3();
        let count = 0;
        
        for (let boid of boids) {
            const distance = this.position.distanceTo(boid.position);
            
            if (distance > 0 && distance < desiredSeparation) {
                const diff = new THREE.Vector3().subVectors(this.position, boid.position);
                diff.normalize();
                diff.divideScalar(distance); // Weight by distance
                steer.add(diff);
                count++;
            }
        }
        
        if (count > 0) {
            steer.divideScalar(count);
        }
        
        if (steer.length() > 0) {
            steer.normalize();
            steer.multiplyScalar(this.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
        }
        
        return steer;
    }
    
    /**
     * Alignment - steer towards the average heading of local flockmates
     */
    align(boids) {
        const neighborDist = 0.3; // Adjusted for smaller scale
        const sum = new THREE.Vector3();
        let count = 0;
        
        for (let boid of boids) {
            const distance = this.position.distanceTo(boid.position);
            
            if (distance > 0 && distance < neighborDist) {
                sum.add(boid.velocity);
                count++;
            }
        }
        
        if (count > 0) {
            sum.divideScalar(count);
            sum.normalize();
            sum.multiplyScalar(this.maxSpeed);
            
            const steer = new THREE.Vector3().subVectors(sum, this.velocity);
            steer.clampLength(0, this.maxForce);
            return steer;
        }
        
        return new THREE.Vector3();
    }
    
    /**
     * Cohesion - steer to move toward the average position of local flockmates
     */
    cohesion(boids) {
        const neighborDist = 0.3; // Adjusted for smaller scale
        const sum = new THREE.Vector3();
        let count = 0;
        
        for (let boid of boids) {
            const distance = this.position.distanceTo(boid.position);
            
            if (distance > 0 && distance < neighborDist) {
                sum.add(boid.position);
                count++;
            }
        }
        
        if (count > 0) {
            sum.divideScalar(count);
            return this.seek(sum);
        }
        
        return new THREE.Vector3();
    }
    
    /**
     * Seek - calculate steering force toward a target
     */
    seek(target) {
        const desired = new THREE.Vector3().subVectors(target, this.position);
        desired.normalize();
        desired.multiplyScalar(this.maxSpeed);
        
        const steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, this.maxForce);
        
        return steer;
    }
    
    /**
     * Toggle trail visibility
     */
    toggleTrail() {
        this.showTrail = !this.showTrail;
        if (!this.showTrail) {
            this.trail = [];
            if (this.trailLine) {
                this.scene.remove(this.trailLine);
                this.trailLine = null;
            }
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        this.scene.remove(this.mesh);
        if (this.trailLine) {
            this.scene.remove(this.trailLine);
        }
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
