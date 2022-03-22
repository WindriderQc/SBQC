import * as THREE from 'three'




export function randomVertexZ(mesh, width, height) {
   
        mesh.geometry.dispose()
        mesh.geometry = new THREE.PlaneGeometry(width, height, width, height ) 
    
        const  posArray = mesh.geometry.attributes.position.array
        for (let i = 0; i < posArray.length; i += 3) {
            const x = posArray[i]
            const y = posArray[i+1]
            const z = posArray[i+2]
    
            //console.log( {x, y, z} )
            //posArray[i] 
            //posArray[i+1]
            posArray[i+2] = z + Math.random()
        }
    }
   
export function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}