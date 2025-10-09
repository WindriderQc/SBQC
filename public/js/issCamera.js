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
        this.p.push();
        this.p.resetMatrix();
        this.p.image(this.buffer, this.p.width - this.buffer.width - 10, this.p.height - this.buffer.height - 10);
        this.p.stroke(255);
        this.p.noFill();
        this.p.rect(this.p.width - this.buffer.width - 10, this.p.height - this.buffer.height - 10, this.buffer.width, this.buffer.height);
        this.p.pop();
    }

    resize() {
        const canvasWidth = this.p.width;
        this.buffer.resizeCanvas(canvasWidth / 4, (canvasWidth / 4) * (9 / 16));
    }
}