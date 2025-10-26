import { Vector2, ShaderMaterial, DoubleSide, IcosahedronBufferGeometry, Mesh } from 'three'

export class MorphSphere{

    material

    constructor(scene, position) {

        const uniforms  = {
            time: {
                type: 'f',
                value: 0
            },
            mousePosition: { 
                type: "v3",
                value: new Vector2( 0, 0, 0 ) 
            }
        }

        this.material = new ShaderMaterial( {
            uniforms,
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,
            side: DoubleSide,
            wireframe: false
        })

        const geometry = new IcosahedronBufferGeometry(2, 5)
        geometry.computeVertexNormals()


        const mesh = new Mesh(geometry ,this.material)
        mesh.position.set(position.x, position.y, position.y)
        scene.add(mesh)
    }

    update(time, frameCount, mousePosition) {  //  TODO:  seem to bug if frameCount = 0...   mettre un catch n console msg?
       

        this.material.uniforms.time.value = frameCount //time
        this.material.uniforms.mousePosition.value.x = mousePosition.x-0.5
        this.material.uniforms.mousePosition.value.y = mousePosition.y-0.5
        this.material.uniforms.mousePosition.value.z = .2

        this.material.uniforms.mousePosition.value.y *= -1
    }
}