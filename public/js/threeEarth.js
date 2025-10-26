// public/js/threeEarth.js

// Ensure this script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // Check if three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded. Ensure it is included before this script.');
        return;
    }

    let scene, camera, renderer, earthMesh, issMesh, clientMesh;
    let issPathMeshes = [];
    let earthquakeMeshes = [];
    const sketchHolder = document.getElementById('sketch-holder');

    // ISS data (will be updated from global scope)
    // let iss = window.iss; // Access global iss variable

    // Client location data (will be updated from global scope)
    // let clientLat = window.clientLat;
    // let clientLon = window.clientLon;

    // Earthquake data (will be accessed from global scope or loaded)
    // let earthquakes = window.earthquakes;

    const EARTH_RADIUS = 300; // Consistent with p5.js version's earthSize
    const ISS_ALTITUDE = 50; // Consistent with p5.js version's issDistanceToEarth
    const GPS_MARKER_SIZE = 5;
    const ISS_MARKER_SIZE = 10; // Adjust as needed
    const ISS_PATH_POINT_SIZE = 2;

    function init() {
        // Scene
        scene = new THREE.Scene();

        // Camera
        const fov = 75;
        const aspect = sketchHolder.offsetWidth / sketchHolder.offsetHeight;
        const near = 0.1;
        const far = 5000; // Increased far plane for skybox/stars if added later
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.z = EARTH_RADIUS * 2; // Initial camera distance

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(sketchHolder.offsetWidth, sketchHolder.offsetHeight);
        renderer.setClearColor(0x343434); // Similar to p5.js background(52)
        sketchHolder.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Softer ambient light
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Brighter directional
        directionalLight.position.set(5, 3, 5); // Adjust position as needed
        scene.add(directionalLight);

        // OrbitControls
        if (typeof THREE.OrbitControls !== 'undefined') {
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.screenSpacePanning = false;
            controls.minDistance = EARTH_RADIUS / 2;
            controls.maxDistance = EARTH_RADIUS * 4;
            controls.update(); // Required after property changes
        } else {
            console.warn('THREE.OrbitControls not loaded.');
        }

        // Earth
        const earthTextureLoader = new THREE.TextureLoader();
        earthTextureLoader.load('/img/Planets/e43_color_s1_8k.jpg', (texture) => {
            const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64); // Increased segments for smoother sphere
            const earthMaterial = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.3, roughness: 0.7 });
            earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
            scene.add(earthMesh);
        });

        // Initial placeholder for ISS - will be updated
        const issTextureLoader = new THREE.TextureLoader();
        issTextureLoader.load('/img/iss.png', (texture) => {
            // Using a Sprite for ISS so it always faces the camera and can be scaled easily
            const issMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.5 });
            issMesh = new THREE.Sprite(issMaterial);
            const issScale = ISS_MARKER_SIZE * 5; // Adjust scale as needed for sprite
            issMesh.scale.set(issScale, issScale, issScale);
            issMesh.visible = false; // Initially hidden until position is known
            scene.add(issMesh);
        });


        // Handle window resize
        window.addEventListener('resize', onWindowResize, false);

        // Start animation loop
        animate();
    }

    function getSphereCoordinates(radius, latitude, longitude) {
        const latRad = THREE.MathUtils.degToRad(latitude);
        const lonRad = THREE.MathUtils.degToRad(longitude);

        // p5.js derived conversion (matches Tools.p5.getSphereCoord)
        // phi corresponds to longitude, theta to latitude
        const phi = lonRad + Math.PI; // Longitude adjustment from p5.js
        const theta = latRad;         // Latitude

        const x = radius * Math.cos(theta) * Math.cos(phi);
        const y = -radius * Math.sin(theta); // Negative y for p5.js consistency
        const z = -radius * Math.cos(theta) * Math.sin(phi); // Negative z part of the conversion

        return new THREE.Vector3(x, y, z);
    }

    // Placeholder for client marker logic
    function updateClientMarker() {
        if (typeof window.clientLat !== 'undefined' && window.clientLat !== null &&
            typeof window.clientLon !== 'undefined' && window.clientLon !== null) {
            if (!clientMesh) {
                const clientGeometry = new THREE.SphereGeometry(GPS_MARKER_SIZE, 16, 16);
                const clientMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow
                clientMesh = new THREE.Mesh(clientGeometry, clientMaterial);
                scene.add(clientMesh);
            }
            const clientPosition = getSphereCoordinates(EARTH_RADIUS + 1, window.clientLat, window.clientLon); // Slightly above surface
            clientMesh.position.copy(clientPosition);

            // Rotate mesh to "point away" from earth center (useful if it's a cone/arrow later)
            clientMesh.lookAt(earthMesh.position); // Makes the marker's local -Z axis point to Earth's center
            clientMesh.rotateX(Math.PI / 2); // Adjust if the marker has a specific "up"

        } else if (clientMesh) {
            clientMesh.visible = false;
        }
    }


    // Placeholder for ISS update logic
    let internalIssPathHistory = []; // To store THREE.Vector3 positions
    const MAX_ISS_HISTORY_POINTS = 1500; // Match p5.js

    function updateISS() {
        if (typeof window.iss !== 'undefined' && window.iss &&
            typeof window.iss.latitude !== 'undefined' && typeof window.iss.longitude !== 'undefined') {

            if (!issMesh || !earthMesh) return; // Ensure meshes are loaded

            const issPosition = getSphereCoordinates(EARTH_RADIUS + ISS_ALTITUDE, window.iss.latitude, window.iss.longitude);
            issMesh.position.copy(issPosition);
            issMesh.visible = true;

            // Update ISS path history
            // Avoid adding duplicate points if ISS data hasn't changed significantly
            if (internalIssPathHistory.length === 0 || internalIssPathHistory[internalIssPathHistory.length - 1].distanceToSquared(issPosition) > 0.1) {
                internalIssPathHistory.push(issPosition.clone());
                if (internalIssPathHistory.length > MAX_ISS_HISTORY_POINTS) {
                    internalIssPathHistory.shift(); // Remove the oldest point
                }

                // Update path visualization
                // Simple: clear and redraw all path points (can be optimized later)
                issPathMeshes.forEach(mesh => scene.remove(mesh));
                issPathMeshes = [];

                const pathMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 }); // Orange
                const pathGeometry = new THREE.SphereGeometry(ISS_PATH_POINT_SIZE, 8, 8);

                for (let i = 0; i < internalIssPathHistory.length; i++) {
                    const pointMesh = new THREE.Mesh(pathGeometry, pathMaterial);
                    pointMesh.position.copy(internalIssPathHistory[i]);
                    scene.add(pointMesh);
                    issPathMeshes.push(pointMesh);
                }
            }
        } else if (issMesh) {
            issMesh.visible = false;
        }
    }

    // Placeholder for earthquake loading and display
    async function loadAndDisplayEarthquakes() {
        if (typeof window.earthquakesData !== 'undefined' && window.earthquakesData) { // Check if data is already loaded by earthThreeJS.ejs
             displayEarthquakes(window.earthquakesData);
        } else {
            try {
                const response = await fetch('/data/quakes.csv');
                if (!response.ok) {
                    console.error('Failed to fetch earthquake data:', response.statusText);
                    return;
                }
                const csvData = await response.text();
                const lines = csvData.split('\n').slice(1); // Skip header line
                const quakes = lines.map(line => {
                    const parts = line.split(',');
                    if (parts.length >= 5) { // Ensure enough data fields
                        return { lat: parseFloat(parts[1]), lon: parseFloat(parts[2]), mag: parseFloat(parts[4]) };
                    }
                    return null;
                }).filter(q => q && !isNaN(q.lat) && !isNaN(q.lon) && !isNaN(q.mag)); // Filter out invalid entries

                window.earthquakesData = quakes; // Cache for future use
                displayEarthquakes(quakes);

            } catch (error) {
                console.error('Error loading or parsing earthquake data:', error);
            }
        }
    }

    function displayEarthquakes(quakesData) {
        if (!earthMesh) return; // Ensure Earth mesh is loaded

        // Clear existing earthquake meshes
        earthquakeMeshes.forEach(mesh => scene.remove(mesh));
        earthquakeMeshes = [];

        const baseQuakeSize = 1;
        const maxMagnitudeEffect = 20; // Max size added for largest quakes

        for (const quake of quakesData) {
            const quakePosition = getSphereCoordinates(EARTH_RADIUS, quake.lat, quake.lon);

            // Scale magnitude: Example mapping, adjust as needed
            const magnitudeScale = Math.max(0, Math.min(1, (quake.mag + 1) / 11)); // Normalize from ~-1 to 10 -> 0 to 1
            const quakeMarkerSize = baseQuakeSize + magnitudeScale * maxMagnitudeEffect;

            const fromColor = new THREE.Color(0x00ff00); // Green for low magnitude
            const toColor = new THREE.Color(0xff0000);   // Red for high magnitude
            const quakeColor = new THREE.Color().lerpColors(fromColor, toColor, magnitudeScale);

            const quakeGeometry = new THREE.SphereGeometry(quakeMarkerSize, 12, 12);
            const quakeMaterial = new THREE.MeshBasicMaterial({ color: quakeColor });
            const quakeMeshInstance = new THREE.Mesh(quakeGeometry, quakeMaterial);
            quakeMeshInstance.position.copy(quakePosition);

            // Orient the quake marker (e.g., if it were a cylinder/bar)
            quakeMeshInstance.lookAt(earthMesh.position);

            scene.add(quakeMeshInstance);
            earthquakeMeshes.push(quakeMeshInstance);
        }
    }


    function onWindowResize() {
        if (camera && renderer && sketchHolder) {
            camera.aspect = sketchHolder.offsetWidth / sketchHolder.offsetHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(sketchHolder.offsetWidth, sketchHolder.offsetHeight);
        }
    }

    function animate() {
        requestAnimationFrame(animate);

        if (earthMesh) {
            // Consistent rotation speed with p5.js (Math.PI * 2 / 60 seconds)
            // millis() / 1000 * rotationSpeed
            // (Date.now() / 1000) * (Math.PI * 2 / 60)
            earthMesh.rotation.y = (Date.now() / 1000) * (Math.PI / 30); // Rotation speed
        }

        updateISS(); // Update ISS position and path
        updateClientMarker(); // Update client marker position

        if (typeof THREE.OrbitControls !== 'undefined' && camera.controls) { // Check if controls exist
            camera.controls.update(); // Only required if controls.enableDamping or controls.autoRotate are set to true
        }

        if (renderer && scene && camera) {
             renderer.render(scene, camera);
        }
    }

    // Initialize everything
    init();
    loadAndDisplayEarthquakes(); // Load earthquake data

});
