import { SphereGeometry, TextureLoader, MeshBasicMaterial, Mesh } from 'three'

export class Earth {
    
    mesh
    speedX 
    speedY 

    constructor(scene, guiRoot, position) {
        
        const texture = new TextureLoader().load('./textures/earth/earth_uv_with_topo.jpg')
        console.log(texture)
        this.mesh = new Mesh(new SphereGeometry(5,50,50), new MeshBasicMaterial({map: texture}))  ////////////////////////////////////////////

 
        //this.mesh.geometry.scale(4,4,4)
        this.mesh.position.set(position.x,position.y, position.z)
        scene.add( this.mesh )

        this.speedX = 2000
        this.speedY = 1000

        const folder = guiRoot.addFolder('Earth')
        folder.add(this, 'speedX', 1, 3600)
        folder.add(this, 'speedY', 1, 3600)

    }

    update(time) {
		//this.mesh.rotation.x = time / this.speedX
	    this.mesh.rotation.y = time / this.speedY
		//this.mesh.position.x += Math.sin(time) + 1
       // this.mesh.rotation.y = Math.cos(time) +10
	}
}