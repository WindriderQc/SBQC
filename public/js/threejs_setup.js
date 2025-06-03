// Ensure Three.js is loaded, if not already loaded globally
// This simple check might need to be more robust depending on how three.js is usually included.
if (typeof THREE === 'undefined' && typeof require !== 'undefined') {
    // Attempt to load if in a Node-like environment (won't work in browser directly without bundling)
    // For browser, ensure three.js is included via a script tag before this script.
    // Given the project structure, it's likely expected to be globally available via a script tag.
    console.warn("THREE object not found. Make sure Three.js library is loaded before this script.");
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('threejs-container');

    if (!container) {
        console.error('Three.js container not found!');
        return;
    }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background

    // Camera
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Sphere
    const geometry = new THREE.SphereGeometry(1.5, 32, 32); // Radius 1.5, 32 segments width, 32 segments height
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff, metalness: 0.5, roughness: 0.5 }); // A shiny blue material
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // White directional light
    directionalLight.position.set(5, 3, 5); // Position the light
    scene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Optional: Add some animation to the sphere
        sphere.rotation.x += 0.005;
        sphere.rotation.y += 0.005;

        renderer.render(scene, camera);
    }

    // Start animation only if THREE is available
    if (typeof THREE !== 'undefined') {
        animate();
    } else {
        // Fallback: display a message in the container if THREE is not loaded
        const errorMsg = document.createElement('p');
        errorMsg.textContent = "Error: Three.js library not loaded. Cannot render scene.";
        errorMsg.style.color = "red";
        errorMsg.style.textAlign = "center";
        errorMsg.style.paddingTop = "20px";
        container.innerHTML = ''; // Clear any previous content/loader
        container.appendChild(errorMsg);
        container.style.backgroundColor = '#f0f0f0'; // Light grey background for error
    }
});
