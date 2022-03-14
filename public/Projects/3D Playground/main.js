import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

let scene, camera, renderer, controls, cube, airplane



scene = new THREE.Scene()
console.log(scene)
camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 10, 30000 )
camera.position.set(-900,-200,-900) //( 0, 0, 100 )
//camera.lookAt( 0, 0, 0 )
const raycaster = new THREE.Raycaster()


renderer = new THREE.WebGLRenderer({antialias:true})
renderer.setSize( window.innerWidth, window.innerHeight )
renderer.setPixelRatio(devicePixelRatio)
renderer.setAnimationLoop( animation )
document.body.appendChild( renderer.domElement )

controls = new OrbitControls(camera, renderer.domElement)
controls.listenToKeyEvents( window ); // optional

//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
//controls.minDistance = 100;
//controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 2;

controls.update();  //controls.update() must be called after any manual changes to the camera's transform


// lights

const dirLight1 = new THREE.DirectionalLight( 0xffffff );
dirLight1.position.set( 1, 1, 1 );
scene.add( dirLight1 );

const dirLight2 = new THREE.DirectionalLight( 0x002288 );
dirLight2.position.set( - 1, - 1, - 1 );
scene.add( dirLight2 );

const ambientLight = new THREE.AmbientLight( 0x222222 );
scene.add( ambientLight );



let type = ".jpg";//	if (bmp) type = ".bmp";
let skyName = "asteroids"
let materialArray = []
let texture_up = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_up" + type)
let texture_bk = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_bk" + type)
let texture_dn = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_dn" + type)
let texture_ft = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_ft" + type)
let texture_lf = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_lf" + type)
let texture_rt = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_rt" + type)

materialArray.push(new THREE.MeshBasicMaterial({map: texture_ft}))
materialArray.push(new THREE.MeshBasicMaterial({map: texture_bk}))
materialArray.push(new THREE.MeshBasicMaterial({map: texture_up}))
materialArray.push(new THREE.MeshBasicMaterial({map: texture_dn}))
materialArray.push(new THREE.MeshBasicMaterial({map: texture_rt}))
materialArray.push(new THREE.MeshBasicMaterial({map: texture_lf}))

materialArray.forEach(mat => mat.side = THREE.BackSide)

let skyboxGeo = new THREE.BoxGeometry(10000,10000,10000)
let skybox = new THREE.Mesh(skyboxGeo, materialArray)
scene.add(skybox)






const loader = new GLTFLoader();
loader.load( './Media/Airplane.glb'
,( gltf )  => {
    airplane = gltf.scene
    airplane.scale.set(10,10,10)
    airplane.position.set(0,-10,0)
    scene.add( airplane )    
}  
,( xhr )   => console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' )  // called while loading is progressing
,( error ) => console.error( error ) 
);


const world = {
    plane: {
        width: 10, 
        height: 10
    }
}


const geometry = new THREE.BoxGeometry()

const texture = new THREE.TextureLoader().load('textures/twoway.jpg')
//const texture = new THREE.TextureLoader().load('textures/018.gif')
//const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } )
const material = new THREE.MeshBasicMaterial( { map: texture } )
cube = new THREE.Mesh( geometry, material )
cube.geometry.scale(4,4,4)
cube.position.set(0,20, 0)
scene.add( cube )

const materialBlue = new THREE.LineBasicMaterial( { color: 0x0000ff } ) //create a blue LineBasicMaterial
const points = []
points.push( new THREE.Vector3( - 10, 0, 0 ) )
points.push( new THREE.Vector3( 0, 10, 0 ) )
points.push( new THREE.Vector3( 10, 0, 0 ) )

const geoLine = new THREE.BufferGeometry().setFromPoints( points )
const line = new THREE.Line( geoLine, materialBlue );
scene.add( line );




const geoPlane = new THREE.PlaneGeometry(10,10,10,10)
const matPlane = new THREE.MeshPhongMaterial({ color: 0xff0000, side: THREE.DoubleSide, flatShading: THREE.FlatShading })
const planeMesh = new THREE.Mesh(geoPlane, matPlane)
randomVertexZ(planeMesh, world.plane.width, world.plane.height)
scene.add(planeMesh)






function randomVertexZ(mesh, width, height) {
   
    mesh.geometry.dispose()
    mesh.geometry = new THREE.PlaneGeometry(width, height, 10, 10) 

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




///  GUI  ////////////////////

const gui = new dat.GUI({height: 5*32 -1})
const worldGui = gui.addFolder('World')
const plane = worldGui.addFolder('Plane')

plane.add(world.plane, 'width', 1, 40).onChange(()=> { randomVertexZ(planeMesh, world.plane.width, world.plane.height) })
plane.add(world.plane, 'height', 1, 30).onChange(()=> { randomVertexZ(planeMesh, world.plane.width, world.plane.height) })

const cubeFolder = gui.addFolder('Cube')
cubeFolder.add(cube.rotation, 'x', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2)
cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2)
cubeFolder.open()
const cameraFolder = gui.addFolder('Camera')
cameraFolder.add(camera.position, 'z', -911, 0)
cameraFolder.open()



///  LOOP Functions  ///

function animation( time ) {

	cube.rotation.x = time / 2000
	cube.rotation.y = time / 1000

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(planeMesh)
    console.log(intersects)

    render()
}


function render() {    renderer.render( scene, camera )  }

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize( window.innerWidth, window.innerHeight )
   
    controls.update();
}
window.addEventListener( 'resize', onWindowResize );

const mouse = { x: undefined, y: undefined }

addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / innerWidth) * 2 - 1  //  normalized coordinates
    mouse.y = -(event.clientY / innerHeight) * 2 + 1  //  normalized coordinates
    console.log(mouse)
})