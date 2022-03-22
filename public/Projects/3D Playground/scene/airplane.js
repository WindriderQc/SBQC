import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class Airplane {
    
    mesh
    

    constructor(scene) {  

        const loader = new GLTFLoader();
        loader.load( './Media/Airplane.glb'
        ,( gltf )  => {
            this.mesh = gltf.scene
            this.mesh.scale.set(10,10,10)
            this.mesh.position.set(0,0,0)
            scene.add( this.mesh )    
        }  
        ,( xhr )   => console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' )  // called while loading is progressing
        ,( error ) => console.error( error ) 
        );

    }

    update(time) {

        var radius = 5;

        let angle = time/360 *  Math.PI * 0.2;
        let xPos = Math.cos(angle) * radius;
        let yPos = Math.sin(angle) * radius;
        xPos += radius;
        yPos += radius;

        if(this.mesh) this.mesh.position.set(xPos, 10, yPos)

    }
}