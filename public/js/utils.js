/**
 * Calculates the great-circle distance between two points on the Earth's surface.
 * @param {number} lat1 - Latitude of the first point.
 * @param {number} lon1 - Longitude of the first point.
 * @param {number} lat2 - Latitude of the second point.
 * @param {number} lon2 - Longitude of the second point.
 * @returns {number} The distance in kilometers.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const toRad = angle => angle * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

/**
 * Converts spherical coordinates (latitude, longitude) to Cartesian (x, y, z) coordinates.
 * @param {p5} p - The p5 instance.
 * @param {number} rayon - The radius of the sphere.
 * @param {number} latitude - The latitude.
 * @param {number} longitude - The longitude.
 * @returns {p5.Vector} A p5.Vector object with the x, y, z coordinates.
 */
export function getSphereCoord(p, rayon, latitude, longitude) {
    const theta = p.radians(latitude);
    const phi = p.radians(longitude) + p.HALF_PI;
    const x = rayon * p.cos(theta) * p.cos(phi);
    const y = -rayon * p.sin(theta);
    const z = -rayon * p.cos(theta) * p.sin(phi);
    return p.createVector(x, y, z);
}