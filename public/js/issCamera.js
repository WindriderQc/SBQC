import { getSphereCoord } from './utils.js';

export default class IssCamera {
    constructor(p, earthTexture, earthSize, issDistance) {
        this.p = p;
        this.earthTexture = earthTexture;
        this.earthSize = earthSize;
        this.issDistance = issDistance;
        this.show = false;
        this.fov = 60;

        const canvasWidth = this.p.width;
        this.buffer = this.p.createGraphics(canvasWidth / 4, (canvasWidth / 4) * (9 / 16), this.p.WEBGL);
    }

    setShow(value) {
        this.show = !!value;
    }

    setFov(value) {
        this.fov = parseInt(value, 10);
    }

    update(issData) {
        if (!this.show || !issData) {
            return;
        }

        const cam = this.buffer;
        cam.background(10, 10, 20);

        const fovRadians = this.p.radians(this.fov);
        cam.perspective(fovRadians, cam.width / cam.height, 0.1, this.earthSize * 10);

        const issPos = getSphereCoord(this.p, this.earthSize + this.issDistance, issData.latitude, issData.longitude);
        cam.camera(issPos.x, issPos.y, issPos.z, 0, 0, 0, 0, 1, 0);

        cam.ambientLight(250);

        cam.push();
        cam.texture(this.earthTexture);
        cam.noStroke();
        cam.sphere(this.earthSize);
        cam.pop();
    }

    display() {
        if (!this.show) {
            return;
        }

        // To display a WEBGL buffer on a WEBGL canvas, we must draw it as a texture on a 2D shape.
        this.p.push();

        // Go into orthographic projection mode to draw 2D elements
        this.p.ortho();
        this.p.noLights();

        // Reset transformation matrix to draw relative to the canvas corner
        this.p.resetMatrix();

        const w = this.buffer.width;
        const h = this.buffer.height;
        const x = this.p.width / 2 - w / 2 - 10;
        const y = this.p.height / 2 - h / 2 - 10;

        this.p.translate(x, y);

        this.p.noStroke();
        this.p.texture(this.buffer);
        this.p.plane(w, h);

        // Draw a border around the overlay
        this.p.noFill();
        this.p.stroke(255);
        this.p.rect(-w/2, -h/2, w, h);

        this.p.pop();
    }

    resize() {
        const canvasWidth = this.p.width;
        this.buffer.resizeCanvas(canvasWidth / 4, (canvasWidth / 4) * (9 / 16));
    }
}