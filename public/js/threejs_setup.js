// Access THREE from global scope (loaded via script tag)
const THREE = window.THREE;

// Ensure Three.js is loaded
if (!THREE) {
    console.error("THREE object not found. Make sure Three.js library is loaded before this script.");
}

// Import Flock3D class (will be loaded as ES6 module)
import Flock3D from './Flock3D.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('threejs-container');

    if (!container) {
        console.error('Three.js container not found!');
        return;
    }

    const textureLoader = new THREE.TextureLoader();

    const brightnessSlider = document.getElementById('slider1');

    // Get additional sliders for flock control
    const separationSlider = document.getElementById('separationSlider');
    const alignmentSlider = document.getElementById('alignmentSlider');
    const cohesionSlider = document.getElementById('cohesionSlider');
    const speedSlider = document.getElementById('speedSlider');
    const boidCountDisplay = document.getElementById('boidCount');

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background

    // Camera
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 3); // Adjusted camera distance

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // OrbitControls for camera manipulation
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movements
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2; // Minimum zoom distance
    controls.maxDistance = 15; // Maximum zoom distance
    controls.enablePan = true; // Allow panning
    controls.autoRotate = false; // Can be toggled via keyboard
    controls.autoRotateSpeed = 0.5;

    // Earth Texture
    const earthDayTexture = textureLoader.load('/img/Planets/e43_color_s1_8k.jpg'); //   1_earth_8k.jpg');
    // Ensure sRGBEncoding for color textures for better visual results with MeshStandardMaterial
    earthDayTexture.encoding = THREE.sRGBEncoding;

    // Sphere (Earth)
    const geometry = new THREE.SphereGeometry(1.5, 32, 32); // Radius 1.5, 32 segments width, 32 segments height
    // const material = new THREE.MeshStandardMaterial({ color: 0x0077ff, metalness: 0.5, roughness: 0.5 });
    const material = new THREE.MeshStandardMaterial({
        map: earthDayTexture,
        metalness: 0.3, // Reduce metalness for a more matte Earth surface
        roughness: 0.8  // Increase roughness
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Cloud Sphere
    const cloudTexture = textureLoader.load('/img/Transparent_Stormy_Weather_Clouds_Map.png');
    cloudTexture.encoding = THREE.sRGBEncoding; // sRGBEncoding for color textures

    const cloudMaterial = new THREE.MeshPhongMaterial({ // Using MeshPhongMaterial for clouds for transparency options
        map: cloudTexture,
        transparent: true,
        opacity: 0.6, // Adjust opacity as needed
        // alphaMap: cloudTexture, // Can also use alphaMap if texture has alpha
        // depthWrite: false, // Useful for transparency sorting issues sometimes
    });
    const cloudSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.52, 32, 32), // Slightly larger than the Earth sphere (1.5)
        cloudMaterial
    );
    scene.add(cloudSphere);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // White directional light
    directionalLight.position.set(5, 3, 5); // Position the light
    scene.add(directionalLight);

    // Initialize Flock3D
    const earthRadius = 1.5; // Match the Earth sphere radius
    const flockAltitude = 0.3; // Altitude above Earth surface (similar to ISS orbit in scale)
    const flock = new Flock3D(scene, earthRadius);
    
    // Populate with initial boids
    const initialBoidCount = 150; 
    flock.populate(initialBoidCount, flockAltitude);
    
    console.log(`Initialized flock with ${initialBoidCount} boids at altitude ${flockAltitude}`);

    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', (event) => {
            const intensityValue = parseFloat(event.target.value) / 50; // Example mapping: 0-100 to 0-2
            // Placeholder for actual brightness update logic
            console.log('Brightness slider changed to:', event.target.value, 'Mapped intensity:', intensityValue);
            if (directionalLight) { // Check if directionalLight is defined
                directionalLight.intensity = intensityValue;
            }
            if (ambientLight) { // Check if ambientLight is defined
                 // Optionally adjust ambient light too, perhaps less drastically
                ambientLight.intensity = intensityValue / 2;
            }
        });
    }

    // Flock parameter event listeners
    if (separationSlider) {
        separationSlider.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            flock.separationWeight = value;
            console.log('Separation weight:', value);
        });
    }

    if (alignmentSlider) {
        alignmentSlider.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            flock.alignmentWeight = value;
            console.log('Alignment weight:', value);
        });
    }

    if (cohesionSlider) {
        cohesionSlider.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            flock.cohesionWeight = value;
            console.log('Cohesion weight:', value);
        });
    }

    if (speedSlider) {
        speedSlider.addEventListener('input', (event) => {
            const speed = parseFloat(event.target.value);
            flock.setMaxSpeed(speed);
            console.log('Boid max speed set to:', speed);
        });
    }

    // Update boid count display
    function updateBoidCount() {
        if (boidCountDisplay) {
            boidCountDisplay.textContent = flock.getCount();
        }
    }

    // Mouse click to add boids
    container.addEventListener('click', (event) => {
        const rect = container.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Add a boid at a random location when clicked
        flock.addRandomBoid(flockAltitude);
        updateBoidCount();
        console.log('Added new boid. Total:', flock.getCount());
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        switch(event.key.toLowerCase()) {
            case ' ': // Space - toggle trails
                event.preventDefault();
                flock.toggleTrails();
                console.log('Toggled boid trails');
                break;
            case 'c': // C - clear all boids
                flock.clear();
                updateBoidCount();
                console.log('Cleared all boids');
                break;
            case 'r': // R - reset to initial count
                flock.clear();
                flock.populate(initialBoidCount, flockAltitude);
                updateBoidCount();
                console.log('Reset flock to', initialBoidCount, 'boids');
                break;
            case 'a': // A - toggle auto-rotate
                controls.autoRotate = !controls.autoRotate;
                console.log('Auto-rotate:', controls.autoRotate ? 'ON' : 'OFF');
                break;
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Update OrbitControls
        controls.update();

        // Optional: Add some animation to the sphere
        sphere.rotation.y += 0.00150; // Slowed down from 0.005 to 0.00150

        if (cloudSphere) { // Check if cloudSphere is defined
            cloudSphere.rotation.y += 0.00125; // Slowed down from 0.0025 to 0.00125
            // cloudSphere.rotation.x += 0.001; // Remove or comment out X-axis rotation
        }

        // Update and render the flock
        flock.run();

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
