import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { GeneralLights } from './generalLights.js'
import { SceneSubject } from '../scene/sceneSubject.js'
import { Airplane } from '../scene/airplane.js'
import { TestCube } from '../scene/testCube.js'


export class SceneManager {

    screenDimensions
    scene 
    renderer 
    raycaster
    camera
    camControl
    sceneSubjects
    prevFrame
    delta
    frameCount = 1
    mouse = { x: undefined, y:undefined }
    guiRoot
   

    constructor(canvas, guiRoot) {

        this.guiRoot = guiRoot

        this.screenDimensions = {
            width: canvas.width,
            height: canvas.height
        }

        this.scene = this.buildScene()
        this.renderer = this.buildRender(this.screenDimensions, canvas)
        this.camera = this.buildCamera(this.screenDimensions)
        this.camControl= this.buildCamControl()
        this.sceneSubjects = this.createSceneSubjects(this.scene)

        this.raycaster = new THREE.Raycaster()


        addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / innerWidth) * 2 - 1  //  normalized coordinates
            this.mouse.y = -(event.clientY / innerHeight) * 2 + 1  //  normalized coordinates
            //console.log(mouse)
        })

        this.renderer.setAnimationLoop(this.animationLoop.bind(this))   //  call it at the end so everything can be ready before first loop
    }

    animationLoop(time) {
    
        this.delta = time - this.prevFrame
        this.prevFrame = time
        this.frameCount++

        this.raycaster.setFromCamera(this.mouse, this.camera)

        for(let i=0; i< this.sceneSubjects.length; i++)  {
            this.sceneSubjects[i].update(time, this.frameCount, this.mouse, this.raycaster)
        }
            
        this.render()
    }

    buildScene() {
        const scene = new THREE.Scene()
        scene.background = new THREE.Color("#000")
        console.log(scene)
        return scene
    }

    buildRender({ width, height }, canvas) {
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        const DPR = (window.devicePixelRatio) ? window.devicePixelRatio : 1
        renderer.setPixelRatio(DPR)
        renderer.setSize(width, height)
       // renderer.gammaInput = true;
       // renderer.gammaOutput  = true; 
        console.log(renderer)
        return renderer
    }

    buildCamera({ width, height }) {
        const fieldOfView = 55;
        const aspectRatio = width / height
        const nearPlane = 10;
        const farPlane = 30000;    
        const camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)

        const cameraFolder = this.guiRoot.addFolder('Camera')
        cameraFolder.add(camera.position, 'x', -1000, 1000)
        cameraFolder.add(camera.position, 'y', -1000, 1000)
        cameraFolder.add(camera.position, 'z', -1000, 1000)
        cameraFolder.open()

        return camera
    }

    buildCamControl() {
        
        const controls = new OrbitControls(this.camera, this.renderer.domElement)
        controls.listenToKeyEvents( window ); // optional
        controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.maxPolarAngle = Math.PI / 2;
        //controls.minDistance = 100;
        //controls.maxDistance = 500;
        controls.update()  //controls.update() must be called after any manual changes to the camera's transform

        return controls
    }

    loadSkybox(type, skyName, size=10000) {
        let materialArray = []
        const texture_up = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_up" + type)
        const texture_bk = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_bk" + type)
        const texture_dn = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_dn" + type)
        const texture_ft = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_ft" + type)
        const texture_lf = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_lf" + type)
        const texture_rt = new THREE.TextureLoader().load('textures/sky/' + skyName + '/' + skyName + "_rt" + type)

        materialArray.push(new THREE.MeshBasicMaterial({map: texture_ft}))
        materialArray.push(new THREE.MeshBasicMaterial({map: texture_bk}))
        materialArray.push(new THREE.MeshBasicMaterial({map: texture_up}))
        materialArray.push(new THREE.MeshBasicMaterial({map: texture_dn}))
        materialArray.push(new THREE.MeshBasicMaterial({map: texture_rt}))
        materialArray.push(new THREE.MeshBasicMaterial({map: texture_lf}))

        materialArray.forEach(mat => mat.side = THREE.BackSide)

        const skyboxGeo = new THREE.BoxGeometry(size, size, size)
        const skybox = new THREE.Mesh(skyboxGeo, materialArray)
        
        this.scene.add(skybox)
        console.log('Skybox loaded: ', skyName)
    }

    createSceneSubjects(scene) {
        const sceneSubjects = [ new GeneralLights(scene), new TestCube(scene, this.guiRoot), new Airplane(scene) ]  //new SceneSubject(scene),
        return sceneSubjects
    }

    addSubject(subject) {
        this.sceneSubjects.push(subject)
    }

    onWindowResize() {
        const { width, height } = canvas;

        this.screenDimensions.width = width
        this.screenDimensions.height = height

        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()
        
        this.renderer.setSize(width, height)
    }

    render() {
        this.renderer.render(this.scene, this.camera);   // render a frame
    }


}