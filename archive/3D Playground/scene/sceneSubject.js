import { Mesh, IcosahedronGeometry, MeshStandardMaterial} from 'three'

export class SceneSubject {

    mesh 

    constructor(scene) {
	
        const radius = 2;
        this.mesh = new Mesh(new IcosahedronGeometry(radius, 2), new MeshStandardMaterial({ flatShading: true }));
        this.mesh.position.set(0, 0, -20);
        scene.add(this.mesh);
    }

	update(time) {
		const scale = Math.sin(time)+2
		this.mesh.scale.set(scale, scale, scale)
	}
}