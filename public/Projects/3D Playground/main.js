import { SceneManager} from './GraphysX/sceneManager.js'
import { TestLine } from './scene/testLine.js'
import { World } from './scene/world.js'
import { PlaneZ } from './scene/planeZ.js'
import { Earth } from './scene/earth.js'
import { MorphSphere } from './scene/morphSphere.js'

const canvas = document.getElementById('canvas'); console.log(canvas.height, canvas.width)


/* https://www.youtube.com/watch?v=zNXQS2DfckU */
  

//  Initialize GUI
const gui = new dat.GUI({height: 5*32 -1})
const worldFolder = gui.addFolder('World')
worldFolder.open()


 //  Initialize sceneManager and scene subjects
const sceneManager = new SceneManager(canvas, worldFolder)
sceneManager.loadSkybox(World.skybox.type, World.skybox.skyName, 10000)

sceneManager.addSubject( new MorphSphere(sceneManager.scene, {x:0, y: 20, z: 0}))
sceneManager.addSubject( new MorphSphere(sceneManager.scene, {x:10, y: 20, z: 0}))
sceneManager.addSubject( new MorphSphere(sceneManager.scene, {x:20, y: 20, z: 0}))
sceneManager.addSubject( new TestLine(sceneManager.scene))
sceneManager.addSubject( new PlaneZ(sceneManager.scene, worldFolder))

const planetsFolder = worldFolder.addFolder('Planets')
const earthFolder = planetsFolder.addFolder('Earth')
const marsFolder = planetsFolder.addFolder('Mars')
const moonFolder = planetsFolder.addFolder('Moon')
sceneManager.addSubject( new Earth(sceneManager.scene, earthFolder, {x:0, y: 20, z: 0}))
sceneManager.addSubject( new Earth(sceneManager.scene, marsFolder, {x:20, y: 20, z: 0}))
sceneManager.addSubject( new Earth(sceneManager.scene, moonFolder, {x:40, y: 20, z: 0}))





function bindEventListeners() {
	window.onresize = resizeCanvas;
	resizeCanvas()
}
bindEventListeners()


function resizeCanvas() {
	canvas.style.width = '100%'
	canvas.style.height= '100%'
	
	canvas.width  = canvas.offsetWidth
	canvas.height = canvas.offsetHeight
    
    sceneManager.onWindowResize()
}
