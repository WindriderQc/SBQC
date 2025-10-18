export default class Globe {
    /**
     * Creates a 3D globe with Earth and cloud layers.
     * @param {object} p - The p5.js instance.
     * @param {number} size - The diameter of the Earth sphere.
     * @param {p5.Image} earthTexture - The texture for the Earth's surface.
     * @param {p5.Image} cloudTexture - The texture for the cloud layer.
     */
    constructor(p, size, earthTexture, cloudTexture) {
        this.p = p;
        this.size = size;
        this.earthTexture = earthTexture;
        this.cloudTexture = cloudTexture;
    }

    /**
     * Renders the globe with its layers.
     * @param {number} cloudRotationY - Optional rotation angle for the cloud layer (in radians).
     */
    draw(cloudRotationY = 0) {
        // Render the Earth sphere
        this.p.push();
        this.p.texture(this.earthTexture);
        this.p.noStroke();
        this.p.sphere(this.size, 24, 16);
        this.p.pop();

        // Render the cloud sphere with independent rotation
        this.p.push();
        this.p.rotateY(cloudRotationY);
        this.p.texture(this.cloudTexture);
        this.p.noStroke();
        this.p.sphere(this.size * 1.02, 24, 16);
        this.p.pop();
    }
}