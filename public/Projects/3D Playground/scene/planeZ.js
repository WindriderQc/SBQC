import { PlaneGeometry, MeshPhongMaterial, Mesh, DoubleSide, FlatShading } from 'three'
import * as GraphysX from '../GraphysX/graphysx.js'
import { World } from './world.js'

export class PlaneZ {
    
    mesh
    raycaster

    constructor(scene, rootGui) {
          
        const width = World.plane.width ? World.plane.width : 10
        const height = World.plane.height ? World.plane.height : 10
        const geoPlane = new PlaneGeometry(width,height,width, height)
        const matPlane = new MeshPhongMaterial({ color: 0xff0000, side: DoubleSide, flatShading: FlatShading })
        this.mesh = new Mesh(geoPlane, matPlane)
        GraphysX.randomVertexZ(this.mesh, width, height)
        scene.add(this.mesh)

     

        const planeFolder = rootGui.addFolder('Plane')
        planeFolder.add(World.plane, 'width', 1, 100).onChange(()=> { GraphysX.randomVertexZ(this.mesh, World.plane.width, World.plane.height) })
        planeFolder.add(World.plane, 'height', 1, 100).onChange(()=> { GraphysX.randomVertexZ(this.mesh, World.plane.width, World.plane.height) })
        planeFolder.add(this.mesh.position, 'x', -100, 100)
        planeFolder.add(this.mesh.position, 'y', -100, 100)
        planeFolder.add(this.mesh.position, 'z', -100, 100)
        planeFolder.open()


    }

    update(time, frameCount, mousePosition, raycaster) {
        const intersects = raycaster.intersectObject(this.mesh)
        if(intersects.length > 0 ) console.log(intersects)
    }
}