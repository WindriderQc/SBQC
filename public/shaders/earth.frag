// Earth Specular Fragment Shader
// Applies diffuse texture with specular highlights based on specular map

precision mediump float;

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec3 vPosition;

uniform sampler2D uDiffuseTexture;
uniform sampler2D uSpecularTexture;
uniform vec3 uLightDirection;
uniform float uSpecularIntensity;
uniform float uShininess;

void main() {
    // Sample the diffuse (color) texture
    vec4 diffuseColor = texture2D(uDiffuseTexture, vTexCoord);
    
    // Sample the specular map (white = reflective, black = matte)
    float specularMask = texture2D(uSpecularTexture, vTexCoord).r;
    
    // Normalize the normal vector
    vec3 normal = normalize(vNormal);
    
    // Light direction (already normalized)
    vec3 lightDir = normalize(uLightDirection);
    
    // Calculate diffuse lighting (Lambertian)
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Calculate view direction (camera is at origin in view space)
    vec3 viewDir = normalize(-vPosition);
    
    // Fresnel effect - water reflects more at grazing angles
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    
    // Calculate specular component (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float specularPower = pow(max(dot(normal, halfDir), 0.0), uShininess);
    
    // Apply specular mask, intensity, and Fresnel effect
    // Fresnel makes water more reflective at edges
    float specular = specularPower * specularMask * uSpecularIntensity * (0.5 + 0.5 * fresnel);
    
    // Combine with realistic lighting:
    // - Higher ambient (0.5) so dark side is visible
    // - Moderate diffuse contribution (0.5) 
    // - Subtle specular highlights on water
    vec3 ambient = diffuseColor.rgb * 0.5;
    vec3 diffuseContribution = diffuseColor.rgb * diffuse * 0.5;
    vec3 specularContribution = vec3(specular);
    
    vec3 finalColor = ambient + diffuseContribution + specularContribution;
    
    // Output final color
    gl_FragColor = vec4(finalColor, diffuseColor.a);
}
