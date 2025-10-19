export default class Globe {
    /**
     * Creates a 3D globe with Earth and cloud layers.
     * @param {object} p - The p5.js instance.
     * @param {number} size - The diameter of the Earth sphere.
     * @param {p5.Image} earthTexture - The texture for the Earth's surface.
     * @param {p5.Image} cloudTexture - The texture for the cloud layer.
     * @param {p5.Image} specularTexture - The texture for specular highlights (optional).
     */
    constructor(p, size, earthTexture, cloudTexture, specularTexture = null) {
        this.p = p;
        this.size = size;
        this.earthTexture = earthTexture;
        this.cloudTexture = cloudTexture;
        this.specularTexture = specularTexture;
        this.earthShader = null;
        this.useSpecular = false;
    }
    
    /**
     * Initializes the custom shader for specular mapping.
     * Must be called after setup() when shaders can be loaded.
     * @param {p5.Shader} shader - The compiled shader.
     */
    setShader(shader) {
        this.earthShader = shader;
        this.useSpecular = (shader !== null && this.specularTexture !== null);
    }
    
    /**
     * Updates the specular texture.
     * @param {p5.Image} newTexture - The new specular texture to apply.
     */
    updateSpecularTexture(newTexture) {
        if (newTexture) {
            this.specularTexture = newTexture;
            this.useSpecular = (this.earthShader !== null && this.specularTexture !== null);
        }
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
     * @param {boolean} showCloud - Whether to render the cloud layer (default: true).
     * @param {Array} lightDirection - Light direction vector [x, y, z] (optional).
     */
    draw(cloudRotationY = 0, showCloud = true, lightDirection = [-0.5, -0.5, -1]) {
        // Render the Earth sphere with higher resolution (64×32 for smoother appearance)
        this.p.push();
        
        if (this.useSpecular && this.earthShader) {
            // Use custom shader with specular mapping
            this.p.shader(this.earthShader);
            
            // Set shader uniforms
            this.earthShader.setUniform('uDiffuseTexture', this.earthTexture);
            this.earthShader.setUniform('uSpecularTexture', this.specularTexture);
            this.earthShader.setUniform('uLightDirection', lightDirection);
            this.earthShader.setUniform('uSpecularIntensity', 0.25); // Subtle, realistic ocean reflection
            this.earthShader.setUniform('uShininess', 20.0); // Moderate shininess for water
        } else {
            // Fallback to standard texture mapping
            this.p.texture(this.earthTexture);
        }
        
        this.p.noStroke();
        this.p.sphere(this.size, 64, 32);
        this.p.pop();

        // Render the cloud sphere with independent rotation (only if showCloud is true)
        if (showCloud) {
            this.p.push();
            // Reset shader for clouds (use default rendering)
            this.p.resetShader();
            // Use ADD blend mode to make the transparent parts of the cloud texture not obscure the earth
            this.p.blendMode(this.p.ADD);
            this.p.rotateY(cloudRotationY);
            this.p.texture(this.cloudTexture);
            this.p.noStroke();
            this.p.sphere(this.size * 1.02, 64, 32);
            // Reset blend mode to default to not affect other elements
            this.p.blendMode(this.p.BLEND);
            this.p.pop();
        }
    }
}