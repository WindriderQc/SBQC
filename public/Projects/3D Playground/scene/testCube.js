import { BoxGeometry, TextureLoader, MeshBasicMaterial, Mesh } from 'three'

export class TestCube {
    
    mesh
    speedX 
    speedY 

    constructor(scene, guiRoot) {
        
        const geometry = new BoxGeometry()

        const texture = new TextureLoader().load('textures/twoway.jpg')
        //const texture = new THREE.TextureLoader().load('textures/018.gif')
        //const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } )
        const material = new MeshBasicMaterial( { map: texture } )
        this.mesh = new Mesh( geometry, material )
        this.mesh.geometry.scale(4,4,4)
        this.mesh.position.set(0,20, 0)
        scene.add( this.mesh )

        this.speedX = 2000
        this.speedY = 1000

        const cubeFolder = guiRoot.addFolder('Cube')
        cubeFolder.add(this, 'speedX', 1, 3600)
        cubeFolder.add(this, 'speedY', 1, 3600)

    }

    update(time) {
		this.mesh.rotation.x = time / this.speedX
	    this.mesh.rotation.y = time / this.speedY
		//this.mesh.position.x += Math.sin(time) + 1
       // this.mesh.rotation.y = Math.cos(time) +10
	}
}