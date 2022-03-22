import { LineBasicMaterial, Vector3, BufferGeometry, Line } from 'three'

export class TestLine {
    constructor(scene) {
        const materialBlue = new LineBasicMaterial( { color: 0x0000ff } ) //create a blue LineBasicMaterial
        const points = []
        points.push( new Vector3( - 10, 0, 0 ) )
        points.push( new Vector3( 0, 10, 0 ) )
        points.push( new Vector3( 10, 0, 0 ) )

        const geoLine = new BufferGeometry().setFromPoints( points )
        const line = new Line( geoLine, materialBlue );
        scene.add( line );
    }

    update() { }

}
