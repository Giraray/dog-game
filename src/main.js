  import * as THREE from 'three'
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
  import * as CANNON from 'cannon-es'
  import CannonDebugger from 'cannon-es-debugger'
  import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
  import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'

  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
  import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
  import {FilmPass} from 'three/examples/jsm/postprocessing/FilmPass.js'

  import * as Shaders from './assets/shaders.js'

  function onWindowResize(){

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize( window.innerWidth, window.innerHeight );

  }
  window.addEventListener( 'resize', onWindowResize, false );

  const scene = new THREE.Scene()

  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
  })
  const slipperyMaterial = new CANNON.Material('slippery')
  const groundMaterial = new CANNON.Material('ground')

  const ground_slippery = new CANNON.ContactMaterial(groundMaterial, slipperyMaterial, {
    friction: 0,
    restitution: 0,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3
  })
  world.addContactMaterial(ground_slippery)

  const ground = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: groundMaterial
  })
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  world.addBody(ground)

  const cannonDebugger = new CannonDebugger(scene, world)

  // camera
  const testCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000)
  testCamera.position.set(100, 300, -100)

  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(100, 300, -100)
  const helper = new THREE.CameraHelper(camera);
  //scene.add(helper)

  // renderer
  const bg = document.getElementById('bg')
  bg.width = window.innerWidth
  bg.height = window.innerHeight

  const renderer = new THREE.WebGLRenderer({
    canvas: bg
  })

  // composer + shader materials
  const composer = new EffectComposer(renderer)

  const uniforms = {
    tDiffuse: composer.readBuffer.texture,
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    frame: { value: 0 }
  }

  const chromaShader = new THREE.ShaderMaterial({
    vertexShader: Shaders.chromaVS,
    fragmentShader: Shaders.chromaFS,
    uniforms: {
      tDiffuse: uniforms.tDiffuse,
      resolution: uniforms.resolution
    }
  })

  const grainShader = new THREE.ShaderMaterial({
    vertexShader: Shaders.chromaVS,
    fragmentShader: Shaders.grainFS,
    uniforms: {
      tDiffuse: uniforms.tDiffuse,
      resolution: uniforms.resolution,
      frame: uniforms.frame
    }
  })

  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new ShaderPass(FXAAShader))
  composer.addPass(new ShaderPass(chromaShader))
  composer.addPass(new ShaderPass(grainShader))

  // gridHelper
  const gridHelper = new THREE.GridHelper(2000, 50)
  scene.add(gridHelper)

  //lights
  const ambientLight = new THREE.AmbientLight(0x99ff99, 1)
  scene.add(ambientLight)

  const topLight = new THREE.PointLight(0xffffff, 10000)
  topLight.position.y = 300
  topLight.position.x = 50
  scene.add(topLight)

  const objLoader = new OBJLoader()

  // player
  const player = new CANNON.Body({
    mass: 10,
    shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
    material: slipperyMaterial
  })
  player.position.set(0, 10, 0)
  world.addBody(player)

  //model
  let playerModel

  const dogMaterial = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: Shaders.dogVS,
    fragmentShader: Shaders.dogFS
  })

  const placeHolderMaterial = new THREE.MeshToonMaterial({ color: 0xffffff })

  objLoader.load('assets/doggo_merged.obj',
    function (obj) {
      obj.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
          child.material = placeHolderMaterial;
        }
      });
      scene.add(obj);
      playerModel = obj;
      console.log(obj)
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + "% loaded")
    },
    function (err) {
      console.error("Error loading 'doggo_merged.obj': " + err)
    }
  );

  const tGeometry = new THREE.TorusGeometry(10, 2, 16, 20);
  const tMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const torus = new THREE.Mesh(tGeometry, tMaterial);
  torus.quaternion.set(0.6, 0, 0, 1)
  scene.add(torus);

  const cubeGeometry = new THREE.BoxGeometry(100, 100, 100);
  const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  scene.add(cube);
  cube.position.set(200, 50, 100)

  //controls
  const controls = new OrbitControls(camera, renderer.domElement);

  // player controls
  const playerControls = {
    up: false,
    left: false,
    down: false,
    right: false
  }
  let movementSpeed = 300

  let cameraLock = true
  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        playerControls.up = true
        break;
      case 'arrowleft':
      case 'a':
        playerControls.left = true
        break;
      case 'arrowdown':
      case 's':
        playerControls.down = true
        break;
      case 'arrowright':
      case 'd':
        playerControls.right = true
        break;
    }
  })

  window.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        playerControls.up = false
        break;
      case 'arrowleft':
      case 'a':
        playerControls.left = false
        break;
      case 'arrowdown':
      case 's':
        playerControls.down = false
        break;
      case 'arrowright':
      case 'd':
        playerControls.right = false
        break;
    }
  })

  function playerMovement() {
    let pVelocity = player.velocity
    let movementMult
    const pc = playerControls
    pVelocity.x = 0
    pVelocity.y = 0
    pVelocity.z = 0

    if([pc.up, pc.left, pc.down, pc.right].filter(Boolean).length > 1) {
      movementMult = 0.5
    }
    else {
      movementMult = 1
    }

    if (pc.up == true && pc.down != true) {
      pVelocity.x += movementSpeed * Math.sin(rotationRadians) * movementMult
      pVelocity.z += movementSpeed * Math.cos(rotationRadians)* movementMult
    }
    if (pc.left == true && pc.right != true) {
      pVelocity.x += movementSpeed * Math.cos(rotationRadians)* movementMult
      pVelocity.z += movementSpeed * Math.sin(-rotationRadians)* movementMult
    }
    if (pc.down == true && pc.up != true) {
      pVelocity.x += -movementSpeed * Math.sin(rotationRadians)* movementMult
      pVelocity.z += -movementSpeed * Math.cos(rotationRadians)* movementMult
    }
    if (pc.right == true && pc.left != true) {
      pVelocity.x += -movementSpeed * Math.cos(rotationRadians)* movementMult
      pVelocity.z += -movementSpeed * Math.sin(-rotationRadians)* movementMult
    }
  }

  function cameraRotateWithPlayer() {
    const idealOffset = new THREE.Vector3(
      playerModel.position.x - 250 * Math.sin(rotationRadians),
      playerModel.position.y + 250,
      playerModel.position.z - 250 * Math.cos(rotationRadians)
    )

    const idealLookat = new THREE.Vector3(
      playerModel.position.x + 250 * Math.sin(rotationRadians),
      playerModel.position.y,
      playerModel.position.z + 250 * Math.cos(rotationRadians)
    )

    camera.position.lerp(idealOffset, 1)
    camera.lookAt(idealLookat)
    testCamera.lookAt(idealLookat.x, idealLookat.y, idealLookat.z)
  }

  let rotationRadians = 0
  let upAngleRadians = 0
  const pointerControls = new PointerLockControls(camera, document.body)
  document.getElementById('lock').addEventListener('click', function () {
    pointerControls.lock()
    let spins = 0
    const pi = Math.PI
    addEventListener('mousemove', (e) => {
      let mouseX = e.movementX * 0.001
      let mouseY = e.movementY * 0.001

      upAngleRadians = camera.rotation.x
      camera.rotation.x -= mouseY

      playerModel.rotation.y -= mouseX
      rotationRadians = playerModel.rotation.y - spins * pi * 2

      if (Math.abs(rotationRadians) > pi * 2) {
        rotationRadians += Math.sign(rotationRadians) * pi * 2
        spins += Math.sign(rotationRadians)
      }
      cameraRotateWithPlayer(rotationRadians)
    })
  })

  //gameloop
  function animate() {
    requestAnimationFrame(animate, 33)
    uniforms.frame.value = renderer.info.render.frame

    world.fixedStep()
    cannonDebugger.update()

    playerModel.position.copy(player.position)
    playerModel.position.y -= 2


    playerMovement()

    //controls.update();
    if (cameraLock == true) { cameraRotateWithPlayer() }

    composer.render(scene, camera)
  }

  animate()