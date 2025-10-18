import { getSphereCoord } from './utils.js';

export default class Trajectory {
    /**
     * Creates a trajectory path for an object in 3D space.
     * @param {object} p - The p5.js instance.
     * @param {p5.Color} color - The color of the trajectory line.
     * @param {number} strokeWeight - The weight of the trajectory line.
     */
    constructor(p, color, strokeWeight = 1.5) {
        this.p = p;
        this.color = color;
        this.strokeWeight = strokeWeight;
        this.points = [];
        this.cached3DPoints = null;
    }

    /**
     * Updates the trajectory with a new set of points.
     * @param {Array<object>} newPoints - An array of points with lat, lon, and time properties.
     */
    update(newPoints) {
        if (Array.isArray(newPoints)) {
            this.points = newPoints;
            this.cached3DPoints = null; // Invalidate cache
        }
    }

    /**
     * Renders the trajectory path.
     * @param {number} radius - The radius of the sphere on which the trajectory is drawn.
     * @param {number} detectionRadiusKM - The detection radius in kilometers.
     * @param {number} userLat - The user's latitude.
     * @param {number} userLon - The user's longitude.
     */
    draw(radius, detectionRadiusKM, userLat, userLon, haversineDistance) {
        if (this.points.length < 2) return;

        if (!this.cached3DPoints || this.cached3DPoints.userLat !== userLat || this.cached3DPoints.userLon !== userLon) {
            let insideCylinder = false;
            let entryPoint = null;
            let exitPoint = null;
            const regularPath = [];
            const highlightedPath = [];

            for (let i = 0; i < this.points.length - 1; i++) {
                const p1 = this.points[i];
                const p2 = this.points[i + 1];
                const dist2 = haversineDistance(p2.lat, p2.lon, userLat, userLon);
                const p2_inside = dist2 <= detectionRadiusKM;

                if (!insideCylinder && p2_inside) {
                    entryPoint = p2;
                    insideCylinder = true;
                    regularPath.push(p1);
                    highlightedPath.push(p1, p2);
                } else if (insideCylinder && !p2_inside) {
                    exitPoint = p2;
                    insideCylinder = false;
                    highlightedPath.push(p1, p2);
                    break;
                } else if (insideCylinder) {
                    highlightedPath.push(p1, p2);
                } else {
                    regularPath.push(p1, p2);
                }
            }

            const regularPath3D = regularPath.map(pt =>
                getSphereCoord(this.p, radius, pt.lat, pt.lon)
            );
            const highlightedPath3D = highlightedPath.map(pt =>
                getSphereCoord(this.p, radius, pt.lat, pt.lon)
            );

            this.cached3DPoints = { regularPath3D, highlightedPath3D, entryPoint, exitPoint };
        }

        const { regularPath3D, highlightedPath3D, entryPoint, exitPoint } = this.cached3DPoints;

        if (regularPath3D.length > 0) {
            this.p.push();
            this.p.stroke(this.color);
            this.p.strokeWeight(this.strokeWeight);
            this.p.noFill();
            this.p.beginShape();
            for (const v of regularPath3D) {
                this.p.vertex(v.x, v.y, v.z);
            }
            this.p.endShape();
            this.p.pop();
        }
        if (highlightedPath3D.length > 0) {
            this.p.push();
            this.p.stroke(255, 255, 0, 220);
            this.p.strokeWeight(3);
            this.p.noFill();
            this.p.beginShape();
            for (const v of highlightedPath3D) {
                this.p.vertex(v.x, v.y, v.z);
            }
            this.p.endShape();
            this.p.pop();
        }

        // Update pass times once per second
        if (this.p.frameCount % 60 === 0) {
            const passEntryTimeSpan = document.getElementById('pass-entry-time');
            const passExitTimeSpan = document.getElementById('pass-exit-time');
            if (entryPoint && passEntryTimeSpan) {
                passEntryTimeSpan.textContent = new Date(Date.now() + entryPoint.time * 1000).toLocaleTimeString();
            } else if (passEntryTimeSpan) {
                passEntryTimeSpan.textContent = 'N/A';
            }
            if (exitPoint && passExitTimeSpan) {
                passExitTimeSpan.textContent = new Date(Date.now() + exitPoint.time * 1000).toLocaleTimeString();
            } else if (passExitTimeSpan) {
                passExitTimeSpan.textContent = 'N/A';
            }
        }
    }
}