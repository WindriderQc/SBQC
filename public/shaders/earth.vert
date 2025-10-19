// Earth Specular Vertex Shader
// Passes texture coordinates, normals, and position to fragment shader

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    // Pass texture coordinates to fragment shader
    vTexCoord = aTexCoord;
    
    // Transform normal to view space
    vNormal = normalize(uNormalMatrix * aNormal);
    
    // Transform position to view space
    vec4 viewPosition = uModelViewMatrix * vec4(aPosition, 1.0);
    vPosition = viewPosition.xyz;
    
    // Final position
    gl_Position = uProjectionMatrix * viewPosition;
}
