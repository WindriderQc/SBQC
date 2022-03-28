import { PointLight,SpotLight, HemisphereLight, DirectionalLight, AmbientLight} from 'three'

export class GeneralLights {

    light
    light1

    constructor(scene) {
       // this.light = new PointLight("#2222ff", 1);
      // scene.add(this.light);

      /*  const dirLight1 = new DirectionalLight( 0xffffff );
        dirLight1.position.set( 1, 1, 1 );
        scene.add( dirLight1 );

        const dirLight2 = new DirectionalLight( 0x002288 );
        dirLight2.position.set( - 1, - 1, - 1 );
        scene.add( dirLight2 );

        const ambientLight = new AmbientLight( 0x222222 );
        scene.add( ambientLight );*/


      /*  var keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(30, 100%, 75%)'), 1.0);
        keyLight.position.set(-100, 0, 100);

        var fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240, 100%, 75%)'), 0.75);
        fillLight.position.set(100, 0, 100);

        var backLight = new THREE.DirectionalLight(0xffffff, 1.0);
        backLight.position.set(100, 0, -100).normalize();

        scene.add(keyLight);
        scene.add(fillLight);
        scene.add(backLight);*/



        var light1 = new HemisphereLight( "#fff", "#000", 1 );
        scene.add(light1)
        this.light1 = light1

        var light = new SpotLight("#fff", 2)
        light.castShadow = true
        light.position.y = 7
        light.position.z = 18

        light.decacy = 2
        light.penumbra = 1

        light.shadow.camera.near = 10
        light.shadow.camera.far = 1000
        light.shadow.camera.fov = 30

        scene.add(light)
        this.light = light

    }

	update(time, frameCount) {
		this.light.intensity = ( Math.sin(frameCount) + 1.5) / 1.5;
		this.light.color.setHSL( Math.sin(frameCount), 0.5, 0.5 );
	}
}