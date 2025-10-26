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

    const textureLoader = new THREE.TextureLoader();

    const brightnessSlider = document.getElementById('slider1');
    const sphereSizeSlider = document.getElementById('slider2');

    if (!brightnessSlider || !sphereSizeSlider) {
        console.error('Slider elements not found!');
        // Optionally, disable further script execution if sliders are critical
        // return;
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

    if (sphereSizeSlider) {
        sphereSizeSlider.addEventListener('input', (event) => {
            // const scaleValue = parseFloat(event.target.value) / 50; // Example mapping: 0-100 to 0-2 (adjust min on slider if 0 is too small)
            // // Placeholder for actual sphere size update logic
            // console.log('Sphere Size slider changed to:', event.target.value, 'Mapped scale:', scaleValue);
            // if (sphere) { // Check if sphere is defined
            //     sphere.scale.set(scaleValue, scaleValue, scaleValue);
            // }
            if (sphere && cloudSphere) { // Check if both are defined
                const earthBaseScale = 1.5; // Original radius of Earth sphere
                const cloudBaseScale = 1.52; // Original radius of cloud sphere
                const minSliderVal = 10, maxSliderVal = 100;
                const minVisualScale = 0.5, maxVisualScale = 2.0; // Desired visual scale range

                // Map slider value (10-100) to visual scale (0.5-2.0)
                const visualScale = minVisualScale + (parseFloat(event.target.value) - minSliderVal) * (maxVisualScale - minVisualScale) / (maxSliderVal - minSliderVal);

                sphere.scale.set(visualScale, visualScale, visualScale);
                // Scale clouds relative to their slightly larger base size, maintaining the visual proportion
                cloudSphere.scale.set(visualScale, visualScale, visualScale);
                console.log('Sphere Size slider changed to:', event.target.value, 'Mapped visual scale:', visualScale);
            }
        });
    }

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
        // sphere.rotation.x += 0.005; // Remove or comment out X-axis rotation
        sphere.rotation.y += 0.005; // Keep Y-axis rotation

        if (cloudSphere) { // Check if cloudSphere is defined
            cloudSphere.rotation.y += 0.0025; // Slower and slightly different rotation for clouds
            // cloudSphere.rotation.x += 0.001; // Remove or comment out X-axis rotation
        }

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
