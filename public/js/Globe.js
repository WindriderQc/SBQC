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
     * Updates the cloud texture with a new image.
     * @param {p5.Image} newTexture - The new cloud texture to apply.
     */
    updateCloudTexture(newTexture) {
        if (newTexture) {
            this.cloudTexture = newTexture;
        }
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
        // Use ADD blend mode to make the transparent parts of the cloud texture not obscure the earth
        this.p.blendMode(this.p.ADD);
        this.p.rotateY(cloudRotationY);
        this.p.texture(this.cloudTexture);
        this.p.noStroke();
        this.p.sphere(this.size * 1.02, 24, 16);
        // Reset blend mode to default to not affect other elements
        this.p.blendMode(this.p.BLEND);
        this.p.pop();
    }
}