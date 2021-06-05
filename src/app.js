import * as THREE from "three";
import { WEBGL } from "./WebGL";
import * as Ammo from "./builds/ammo";
import {
  billboardTextures,
  boxTexture,
  inputText,
  URL,
} from "./resources/textures";

import {
  setupEventHandlers,
  moveDirection,
  isTouchscreenDevice,
  touchEvent,
  createJoystick,
} from "./resources/eventHandlers";

import {
  preloadDivs,
  preloadOpacity,
  postloadDivs,
  startScreenDivs,
  startButton,
  noWebGL,
  fadeOutDivs,
} from "./resources/preload";

import {
  clock,
  scene,
  camera,
  renderer,
  stats,
  manager,
  createWorld,
  lensFlareObject,
  createLensFlare,
  particleGroup,
  particleAttributes,
  particleSystemObject,
  glowingParticles,
  addParticles,
  moveParticles,
} from "./resources/world";

import {
  simpleText,
  floatingLabel,
  allSkillsSection,
  createTextOnPlane,
} from "./resources/surfaces";

import {
  pickPosition,
  launchClickPosition,
  getCanvasRelativePosition,
  rotateCamera,
} from "./resources/utils";


// start Ammo Engine
Ammo().then((Ammo) => {
  //Ammo.js variable declaration
  let rigidBodies = [],
    physicsWorld;

  //Ammo Dynamic bodies for ball
  let ballObject = null;
  const STATE = { DISABLE_DEACTIVATION: 4 };

  //default transform object
  let tmpTrans = new Ammo.btTransform();

  // list of hyperlink objects
  var objectsWithLinks = [];

  //function to create physics world with Ammo.js
  function createPhysicsWorld() {
    //algortihms for full (not broadphase) collision detection
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
      dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration), // dispatch calculations for overlapping pairs/ collisions.
      overlappingPairCache = new Ammo.btDbvtBroadphase(), //broadphase collision detection list of all possible colliding pairs
      constraintSolver = new Ammo.btSequentialImpulseConstraintSolver(); //causes the objects to interact properly, like gravity, game logic forces, collisions

    // see bullet physics docs for info
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      overlappingPairCache,
      constraintSolver,
      collisionConfiguration
    );

    // add gravity
    physicsWorld.setGravity(new Ammo.btVector3(0, -50, 0));
  }

  //create flat plane
  function createGridPlane() {
    // block properties
    let pos = { x: 0, y: 0, z: 0 };
    let scale = { x: 275, y: 0.5, z: 275 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; //mass of zero = infinite mass
    
    //create grid overlay on plane
    var grid = new THREE.GridHelper(175, 20, 0xffffff, 0xffffff);
    grid.material.opacity = 0;
    grid.material.transparent = true;
    grid.position.y = 0.00;
    scene.add(grid);

    //Create Threejs Plane
    let blockPlane = new THREE.Mesh(
      new THREE.BoxBufferGeometry(),
      new THREE.MeshPhongMaterial({
        color: 0x282e39,
        transparent: true,
        opacity: .9,
      })
    );
    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.scale.set(scale.x, scale.y, scale.z);
    blockPlane.receiveShadow = true;
    scene.add(blockPlane);
    

    //Ammo.js Physics
    let transform = new Ammo.btTransform();
    transform.setIdentity(); // sets safe default values
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    //setup collision box
    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    //  provides information to create a rigid body
    let rigidBodyStruct = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rigidBodyStruct);
    body.setFriction(10);
    body.setRollingFriction(10);

    // add to world
    physicsWorld.addRigidBody(body);
  } 
  // create ball
  function createBall() {
    let pos = { x: 8.75, y: 1, z: 0 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 30;

    var marble_loader = new THREE.TextureLoader(manager);
    var marbleTexture = marble_loader.load("./src/jsm/download.jpeg");
    marbleTexture.wrapS = marbleTexture.wrapT = THREE.RepeatWrapping;
    marbleTexture.repeat.set(1, 1);
    marbleTexture.anisotropy = 1;
    marbleTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = (ballObject = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: marbleTexture })
    ));

    ball.geometry.computeBoundingSphere();
    ball.geometry.computeBoundingBox();

    ball.position.set(pos.x, pos.y, pos.z);

    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(20, 20, 20);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);
    //body.setFriction(4);
    body.setRollingFriction(3);

    //set ball friction

    //once state is set to disable, dynamic interaction no longer calculated
    body.setActivationState(STATE.DISABLE_DEACTIVATION);

    physicsWorld.addRigidBody(
      body //collisionGroupRedBall, collisionGroupGreenBall | collisionGroupPlane
    );

    ball.userData.physicsBody = body;
    ballObject.userData.physicsBody = body;

    rigidBodies.push(ball);
    rigidBodies.push(ballObject);
  }

  //create beach ball Mesh
  function createBeachBall() {
    let pos = { x: 11, y: 30, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/bb");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(.05);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
   function createBeachBall2() {
    let pos = { x: 6, y: 930, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/bb");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(.05);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
  function createBeachBall3() {
    let pos = { x: 17, y: 930, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/bb");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(.05);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
   function createBasketBall() {
    let pos = { x: 85, y: 5, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/download.jpeg");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(0);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
function createBasketBall4() {
    let pos = { x: 65, y: 140, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/download.jpeg");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(0);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }function createBasketBall2() {
    let pos = { x: 35, y: 220, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/download.jpeg");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(0);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
function createBasketBall6() {
    let pos = { x: 30, y: 40, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/download.jpeg");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(0);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
  function createBasketBall3() {
    let pos = { x: 75, y: 40, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/download.jpeg");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(0);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
  function createBasketBall7() {
    let pos = { x: 45, y: 10, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/download.jpeg");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(0);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
  function createBasketBall5() {
    let pos = { x: 55, y: 40, z: -35 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 4;

    //import beach ball texture
    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/download.jpeg");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball); 
    

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(0);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }
  //create link boxes
  function createBox(
    x,
    y,
    z,
    scaleX,
    scaleY,
    scaleZ,
    boxTexture,
    URLLink,
    color = 0x000000,
    transparent = true
  ) {
    const boxScale = { x: scaleX, y: scaleY, z: scaleZ };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; //mass of zero = infinite mass

    //load link logo
    const loader = new THREE.TextureLoader(manager);
    const texture = loader.load(boxTexture);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    const loadedTexture = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: transparent,
      color: 0xffffff,
    });

    var borderMaterial = new THREE.MeshBasicMaterial({
      color: color,
    });
    borderMaterial.color.convertSRGBToLinear();

    var materials = [
      borderMaterial, // Left side
      borderMaterial, // Right side
      borderMaterial, // Top side   ---> THIS IS THE FRONT
      borderMaterial, // Bottom side --> THIS IS THE BACK
      loadedTexture, // Front side
      borderMaterial, // Back side
    ];

    const linkBox = new THREE.Mesh(
      new THREE.BoxBufferGeometry(boxScale.x, boxScale.y, boxScale.z),
      materials
    );
    linkBox.position.set(x, y, z);
    linkBox.renderOrder = 1;
    linkBox.castShadow = true;
    linkBox.receiveShadow = true;
    linkBox.userData = { URL: URLLink, email: URLLink };
    scene.add(linkBox);
    objectsWithLinks.push(linkBox.uuid);

    addRigidPhysics(linkBox, boxScale);
  }

  //create Ammo.js body to add solid mass to "David Jeffers"
  function davidJeffersText(x, y, z) {
    const boxScale = { x: 0, y: 0, z: 0 };
    let quat = { x: 0, y: 0, z: 0, w: 0 };
    let mass = 6; //mass of zero = infinite mass

    const linkBox = new THREE.Mesh(
      new THREE.BoxBufferGeometry(boxScale.x, boxScale.y, boxScale.z),
      new THREE.MeshPhongMaterial({
        color: 0xff6600,
      })
    );

    linkBox.position.set(x, y, z);
    linkBox.castShadow = true;
    linkBox.receiveShadow = true;
    objectsWithLinks.push(linkBox.uuid);

    addRigidPhysics(linkBox, boxScale);
  }

  //loads text for David Jeffers Mesh
  function loadRyanText() {
    var text_loader = new THREE.FontLoader();

    text_loader.load("./src/jsm/Roboto_Regular.json", function (font) {
      var xMid, text;

      var color = 0xffffff;

      var textMaterials = [
        new THREE.MeshBasicMaterial({ color: color }), // front
        new THREE.MeshPhongMaterial({ color: color }), // side
      ];

      var geometry = new THREE.TextGeometry("David Jeffers", {
        font: font,
        size: 4,
        height: 1.5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.11,
        bevelOffset: 0,
        bevelSegments: 1,
      });

      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

      geometry.translate(xMid, .5, 0);

      var textGeo = new THREE.BufferGeometry().fromGeometry(geometry);

      text = new THREE.Mesh(geometry, textMaterials);
      text.position.z = -20;
      text.position.y = 7.1;
       text.position.x = -7;
      text.receiveShadow = true;
      text.castShadow = true;
      scene.add(text);
    });
  }

  //create "software engineer text"
  function loadEngineerText() {
    var text_loader = new THREE.FontLoader();

    text_loader.load("./src/jsm/Roboto_Regular.json", function (font) {
      var xMid, text;

      var color = 0xff0000;

      var textMaterials = [
        new THREE.MeshBasicMaterial({ color: color }), // front
        new THREE.MeshPhongMaterial({ color: color }), // side
      ];

      var geometry = new THREE.TextGeometry("SOFTWARE ENGINEER", {
        font: font,
        size: 1.5,
        height: 0.5,
        curveSegments: 20,
        bevelEnabled: true,
        bevelThickness: 0.25,
        bevelSize: 0.1,
      });

      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

      geometry.translate(xMid, .5, 0);

      var textGeo = new THREE.BufferGeometry().fromGeometry(geometry);

      text = new THREE.Mesh(textGeo, textMaterials);
      text.position.z = -19.50;
      text.position.y = 4.9;
      text.position.x = -7;
      text.receiveShadow = true;
      text.castShadow = true;
      scene.add(text);
    });
  }

  //function to create billboard
  function createBillboard(
    x,
    y,
    z,
    textureImage = billboardTextures.grassImage,
    urlLink,
    rotation = 0
  ) {
    const billboardPoleScale = { x: 0, y: 0, z: 0 };
    const billboardSignScale = { x: 50, y: 1.9, z: 1 };
    const billboardPole = new THREE.Mesh(
      new THREE.BoxBufferGeometry(
        billboardPoleScale.x,
        billboardPoleScale.y,
        billboardPoleScale.z
      ),
      new THREE.MeshStandardMaterial({
        color: 0x878787,
        
      })
    );

    /* default texture loading */
    const loader = new THREE.TextureLoader(manager);
    const texture = loader.load(textureImage);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    var borderMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
     
    });
    const loadedTexture = new THREE.MeshBasicMaterial({
      color: 0x000000,
      
    });

    var materials = [
      borderMaterial, // Left side
      borderMaterial, // Right side
      borderMaterial, // Top side   ---> THIS IS THE FRONT
      borderMaterial, // Bottom side --> THIS IS THE BACK
      loadedTexture, // Front side
      borderMaterial, // Back side
    ];
    // order to add materials: x+,x-,y+,y-,z+,z-
    const billboardSign = new THREE.Mesh(
      new THREE.BoxGeometry(
        billboardSignScale.x,
        billboardSignScale.y,
        billboardSignScale.z
      ),
      materials
    );

    billboardPole.position.x = x;
    billboardPole.position.y = y;
    billboardPole.position.z = z;

    billboardSign.position.x = 37;
    billboardSign.position.y = 1;
    billboardSign.position.z = -100;

    /* Rotate Billboard */
    

    billboardPole.castShadow = true;
    billboardPole.receiveShadow = true;

    billboardSign.castShadow = true;
    billboardSign.receiveShadow = true;

    billboardSign.userData = { URL: urlLink };

   
    scene.add(billboardSign);
    addRigidPhysics(billboardPole, billboardPoleScale);
    addRigidPhysics(billboardSign, billboardSignScale);
  }

  //create vertical billboard
  function createBillboardRotated(
    x,
    y,
    z,
    textureImage = billboardTextures.grassImage,
    urlLink,
    rotation = 0
  ) {
    const billboardPoleScale = { x: 0, y: 0, z: 0 };
    const billboardSignScale = { x: 20, y: 5, z: 1 };
    const billboardPole = new THREE.Mesh(
      new THREE.BoxBufferGeometry(
        billboardPoleScale.x,
        billboardPoleScale.y,
        billboardPoleScale.z
      ),
      new THREE.MeshStandardMaterial({
        color: 0x878787,
      })
    );

    /* default texture loading */
    const loader = new THREE.TextureLoader(manager);
    const texture = loader.load(textureImage);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    var borderMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });
    const loadedTexture = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });

    var materials = [
      borderMaterial, // Left side
      borderMaterial, // Right side
      borderMaterial, // Top side   ---> THIS IS THE FRONT
      borderMaterial, // Bottom side --> THIS IS THE BACK
      loadedTexture, // Front side
      borderMaterial, // Back side
    ];
    // order to add materials: x+,x-,y+,y-,z+,z-
    const billboardSign = new THREE.Mesh(
      new THREE.BoxGeometry(
        billboardSignScale.x,
        billboardSignScale.y,
        billboardSignScale.z
      ),
      materials
    );

    billboardPole.position.x = x;
    billboardPole.position.y = y;
    billboardPole.position.z = z;

    billboardSign.position.x = 12;
    billboardSign.position.y = y + 1;
    billboardSign.position.z = -95;

    /* Rotate Billboard */
   

    billboardPole.castShadow = true;
    billboardPole.receiveShadow = true;

    billboardSign.castShadow = true;
    billboardSign.receiveShadow = true;

    billboardSign.userData = { URL: urlLink };

    
    scene.add(billboardSign);
    addRigidPhysics(billboardPole, billboardPoleScale);
    addRigidPhysics(billboardSign, billboardSignScale);
  }

  //create X axis wall around entire plane
  function createWallX(x, y, z) {
    const wallScale = { x: 260, y: 2, z: 0.5 };

    const wall = new THREE.Mesh(
      new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.75,
        transparent: true,
      })
    );

    wall.position.x = x;
    wall.position.y = y;
    wall.position.z = z;

    wall.receiveShadow = true;

    scene.add(wall);

    addRigidPhysics(wall, wallScale);
  }

  //create Z axis wall around entire plane
  function createWallZ(x, y, z) {
    const wallScale = { x: 0, y: 0, z: 0 };

    const wall = new THREE.Mesh(
      new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.75,
        transparent: true,
      })
    );

    wall.position.x = x;
    wall.position.y = y;
    wall.position.z = z;

    wall.receiveShadow = true;

    scene.add(wall);

    addRigidPhysics(wall, wallScale);
  }
  function hoop(x, y, z) {
 let hoopScale = {x: 1, y: 1, z: 1};
   
    let geometry = new THREE.RingGeometry( 4, 5, 32 );
let material = new THREE.MeshBasicMaterial( { color: 0xffff00, side: THREE.DoubleSide } );
let mesh = new THREE.Mesh( geometry, material );
    let Box = new THREE.Mesh(  new THREE.RingBufferGeometry( hoopScale.x , hoopScale.y, hoopScale.z),
      new THREE.MeshBasicMaterial( { color: 0xffff00, side: THREE.DoubleSide } ))
      let Box2 = new THREE.Mesh(  new THREE.RingBufferGeometry( hoopScale.x , hoopScale.y, hoopScale.z),
      new THREE.MeshBasicMaterial( { color: 0xffff00, side: THREE.DoubleSide } ))
    mesh.position.set(37, 5, -88);
    Box.position.set(41.5, 3, -88);
    Box.castShadow = true;
    Box.receiveShadow = true;
   Box2.position.set(32.5, 3, -88);
    scene.add( mesh );
    addRigidPhysics(Box2, hoopScale);
    addRigidPhysics(Box, hoopScale); }
  //create brick wall
  function wallOfBricks() {
    var pos = new THREE.Vector3();
    var quat = new THREE.Quaternion();
    var brickMass = 0.01;
    var brickLength = 3;
    var brickDepth = 3;
    var brickHeight = 1.5;
    var numberOfBricksAcross = 6;
    var numberOfRowsHigh = 6;

    pos.set(70, brickHeight * 0.5, -75);
    quat.set(0, 0, 0, 1);

    for (var j = 0; j < numberOfRowsHigh; j++) {
      var oddRow = j % 2 == 1;

      pos.x = 5;

      if (oddRow) {
        pos.x += 0.25 * brickLength;
      }

      var currentRow = oddRow ? numberOfBricksAcross + 1 : numberOfBricksAcross;
      for (let i = 0; i < currentRow; i++) {
        var brickLengthCurrent = brickLength;
        var brickMassCurrent = brickMass;
        if (oddRow && (i == 0 || i == currentRow - 1)) {
          //first or last brick
          brickLengthCurrent *= 0.5;
          brickMassCurrent *= 0.5;
        }
        var brick = createBrick(
          brickLengthCurrent,
          brickHeight,
          brickDepth,
          brickMassCurrent,
          pos,
          quat,
          new THREE.MeshLambertMaterial({
            color: 0xffffff,
          })
        );
        brick.castShadow = true;
        brick.receiveShadow = true;

        if (oddRow && (i == 0 || i == currentRow - 2)) {
          //first or last brick
          pos.x += brickLength * 0.25;
        } else {
          pos.x += brickLength;
        }
        pos.z += 0.0001;
      }
      pos.y += brickHeight;
    }
  }


  //helper function to create individual brick mesh
  function createBrick(sx, sy, sz, mass, pos, quat, material) {
    var threeObject = new THREE.Mesh(
      new THREE.BoxBufferGeometry(sx, sy, sz, 1, 1, 1),
      material
    );
    var shape = new Ammo.btBoxShape(
      new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
    );
    shape.setMargin(0.05);

    createBrickBody(threeObject, shape, mass, pos, quat);

    return threeObject;
  }

  //add physics to brick body
  function createBrickBody(threeObject, physicsShape, mass, pos, quat) {
    threeObject.position.copy(pos);
    threeObject.quaternion.copy(quat);

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      physicsShape,
      localInertia
    );
    var body = new Ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    scene.add(threeObject);

    if (mass > 0) {
      rigidBodies.push(threeObject);

      // Disable deactivation
      body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);
  }
   function wallOfBricks2() {
    var pos = new THREE.Vector3();
    var quat = new THREE.Quaternion();
    var brickMass = 0.01;
    var brickLength = 3;
    var brickDepth = 3;
    var brickHeight = 1.5;
    var numberOfBricksAcross = 6;
    var numberOfRowsHigh = 6;

    pos.set(50, brickHeight * 0.5, -90);
    quat.set(0, 0, 0, 1);

    for (var j = 0; j < numberOfRowsHigh; j++) {
      var oddRow = j % 2 == 1;

      pos.x = 5;

      if (oddRow) {
        pos.x += 0.25 * brickLength;
      }

      var currentRow = oddRow ? numberOfBricksAcross + 1 : numberOfBricksAcross;
      for (let i = 0; i < currentRow; i++) {
        var brickLengthCurrent = brickLength;
        var brickMassCurrent = brickMass;
        if (oddRow && (i == 0 || i == currentRow - 1)) {
          //first or last brick
          brickLengthCurrent *= 0.5;
          brickMassCurrent *= 0.5;
        }
        var brick = createBrick(
          brickLengthCurrent,
          brickHeight,
          brickDepth,
          brickMassCurrent,
          pos,
          quat,
          new THREE.MeshLambertMaterial({
            color: 0xffffff,
          })
        );
        brick.castShadow = true;
        brick.receiveShadow = true;

        if (oddRow && (i == 0 || i == currentRow - 2)) {
          //first or last brick
          pos.x += brickLength * 0.25;
        } else {
          pos.x += brickLength;
        }
        pos.z += 0.0001;
      }
      pos.y += brickHeight;
    }
  }


  //helper function to create individual brick mesh
  function createBrick2(sx, sy, sz, mass, pos, quat, material) {
    var threeObject = new THREE.Mesh(
      new THREE.BoxBufferGeometry(sx, sy, sz, 1, 1, 1),
      material
    );
    var shape = new Ammo.btBoxShape(
      new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
    );
    shape.setMargin(0.05);

    createBrickBody2(threeObject, shape, mass, pos, quat);

    return threeObject;
  }

  //add physics to brick body
  function createBrickBody2(threeObject, physicsShape, mass, pos, quat) {
    threeObject.position.copy(pos);
    threeObject.quaternion.copy(quat);

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      physicsShape,
      localInertia
    );
    var body = new Ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    scene.add(threeObject);

    if (mass > 0) {
      rigidBodies.push(threeObject);

      // Disable deactivation
      body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);
  }

  function createTriangle(x, z) {
    var geom = new THREE.Geometry();
    var v1 = new THREE.Vector3(4, 0, 0);
    var v2 = new THREE.Vector3(5, 0, 0);
    var v3 = new THREE.Vector3(4.5, 1, 0);

    geom.vertices.push(v1);
    geom.vertices.push(v2);
    geom.vertices.push(v3);

    geom.faces.push(new THREE.Face3(0, 1, 2));
    geom.computeFaceNormals();

    var mesh = new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    //mesh.rotation.z = -90;
    mesh.position.y = 0.01;
    mesh.position.x = x;
    mesh.position.z = z;
    scene.add(mesh);
  }
  //generic function to add physics to Mesh with scale
  function addRigidPhysics(item, itemScale) {
    let pos = { x: item.position.x, y: item.position.y, z: item.position.z };
    let scale = { x: itemScale.x, y: itemScale.y, z: itemScale.z };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0;
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );

    var localInertia = new Ammo.btVector3(0, 0, 0);
    var motionState = new Ammo.btDefaultMotionState(transform);
    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    colShape.setMargin(0.05);
    colShape.calculateLocalInertia(mass, localInertia);
    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);
    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(2);
    physicsWorld.addRigidBody(body);
  }

  function moveBall() {
    let scalingFactor = 20;
    let moveX = moveDirection.right - moveDirection.left;
    let moveZ = moveDirection.back - moveDirection.forward;
    let moveY = 0;

    if (ballObject.position.y < 2.01) {
      moveX = moveDirection.right - moveDirection.left;
      moveZ = moveDirection.back - moveDirection.forward;
      moveY = 0;
    } else {
      moveX = moveDirection.right - moveDirection.left;
      moveZ = moveDirection.back - moveDirection.forward;
      moveY = -0.25;
    }

    // no movement
    if (moveX == 0 && moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ);
    resultantImpulse.op_mul(scalingFactor);
    let physicsBody = ballObject.userData.physicsBody;
    physicsBody.setLinearVelocity(resultantImpulse);
  }

  function renderFrame() {
    // FPS stats module
    stats.begin();

    let deltaTime = clock.getDelta();
    if (!isTouchscreenDevice())
      if (document.hasFocus()) {
        moveBall();
      } else {
        moveDirection.forward = 0;
        moveDirection.back = 0;
        moveDirection.left = 0;
        moveDirection.right = 0;
      }
    else {
      moveBall();
    }

    updatePhysics(deltaTime);

    moveParticles();

    renderer.render(scene, camera);
    stats.end();

    // tells browser theres animation, update before the next repaint
    requestAnimationFrame(renderFrame);
  }

  //loading page section
  function startButtonEventListener() {
    for (let i = 0; i < fadeOutDivs.length; i++) {
      fadeOutDivs[i].classList.add("fade-out");
    }
    setTimeout(() => {
      document.getElementById("preload-overlay").style.display = "none";
    }, 750);

    startButton.removeEventListener("click", startButtonEventListener);
    document.addEventListener("click", launchClickPosition);
    createBeachBall();
  }

  function updatePhysics(deltaTime) {
    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update rigid bodies
    for (let i = 0; i < rigidBodies.length; i++) {
      let objThree = rigidBodies[i];
      let objAmmo = objThree.userData.physicsBody;
      let ms = objAmmo.getMotionState();
      if (ms) {
        ms.getWorldTransform(tmpTrans);
        let p = tmpTrans.getOrigin();
        let q = tmpTrans.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }

    //check to see if ball escaped the plane
    if (ballObject.position.y < -50) {
      scene.remove(ballObject);
      createBall();
    }

    //check to see if ball is on text to rotate camera
    rotateCamera(ballObject);
  }

  //document loading
  manager.onStart = function (item, loaded, total) {
    //console.log("Loading started");
  };

  manager.onLoad = function () {
    var readyStateCheckInterval = setInterval(function () {
      if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        for (let i = 0; i < preloadDivs.length; i++) {
          preloadDivs[i].style.visibility = "hidden"; // or
          preloadDivs[i].style.display = "none";
        }
        for (let i = 0; i < postloadDivs.length; i++) {
          postloadDivs[i].style.visibility = "visible"; // or
          postloadDivs[i].style.display = "block";
        }
      }
    }, 1000);
    //console.log("Loading complete");
  };

  manager.onError = function (url) {
    //console.log("Error loading");
  };

  startButton.addEventListener("click", startButtonEventListener);

  if (isTouchscreenDevice()) {
    document.getElementById("appDirections").innerHTML =
      "Use the joystick in the bottom left to move the ball. Please use your device in portrait orientation!";
    createJoystick(document.getElementById("joystick-wrapper"));
    document.getElementById("joystick-wrapper").style.visibility = "visible";
    document.getElementById("joystick").style.visibility = "visible";
  }

  //initialize world and begin
  function start() {
    createWorld();
    createPhysicsWorld();

    createGridPlane();
    createBall();

    
    hoop();
  createBasketBall();
    

    davidJeffersText(11.2, 1, -20);
    createTextOnPlane(-70, 0.01, -48, inputText.terpSolutionsText, 20, 40);
    createTextOnPlane(-42, 0.01, -53, inputText.bagholderBetsText, 20, 40);
    createTextOnPlane(-14, 0.01, -49, inputText.homeSweetHomeText, 20, 40);

    createBox(
      -17,
      2,
      -70,
      4,
      4,
      1,
      boxTexture.Github,
      URL.gitHub,
      0x000000,
      true
    );
    
    createBox(
      -29,
      2,
      -70,
      4,
      4,
      1,
      boxTexture.globe,
      URL.davidjeffers,
      0xffffff,
      false
    );

    createBox(
      -23,
      2,
      -70,
      4,
      4,
      1,
      boxTexture.mail,
      "mailto:ohsjeffers@gmail.com",
      0x000000,
      false
    );

    createWallX(0, 1.5, -133.5);

    floatingLabel(-17, 4.5, -70, "Github");
    floatingLabel(-22.875, 4.5, -70, "Email");
    floatingLabel(-29, 6.5, -70, "  Static \nWebsite");
   

    allSkillsSection(-59, 0.350, -70, 40, 40, boxTexture.allSkills);
    
    allSkillsSection(9, 0.01, 40, 21, 10.5, inputText.staticPortfolio);
      allSkillsSection(5, 0.7, 49, 65, 40, inputText.activities);
    //lensflare
    createLensFlare(50, -50, -800, 200, 200, boxTexture.lensFlareMain);

    loadRyanText();
    loadEngineerText();

    let touchText, instructionsText;
    if (isTouchscreenDevice()) {
      touchText = "Touch boxes with your \nfinger to open links";
      instructionsText =
        "   Use the joystick in the bottom \nleft of the screen to move the ball.";
    } else {
      touchText = "Click on boxes with \nthe mouse to open links";
      instructionsText =
        "Use the arrow keys on your \n keyboard to move the ball.";
    }

    simpleText(9, 0.01, 5, instructionsText, 1.25);

    
    simpleText(-58, 0.1, -45, "Technologies", 3);
    simpleText(-18, 0.1, -50, "Click on boxes with mouse to open", 1.5);
    simpleText(-18, 0.1, -55, "Static website has full portfoilo with projects", 1.5);
     simpleText(-18, 0.1, -60, "Email for work, hire or inquiries", 1.5);
    simpleText(50, 0.1, -31, "Shoot through the hoop!", 2);
    simpleText(10.5, 0.1, -32, "Bowl!", 2);
     simpleText(69, 0.1, -11, "I am passionate about software engineering!", 2);
     simpleText(69, 0.1, -7, "I am currently focused on React Development", 2);
     simpleText(69, 0.1, -3, "But I will learn any technology/language/framework", 2);
     simpleText(69, 0.1, 1, "to create beautiful frontend or backend software", 2);
      simpleText(-58, 0.1, 9, "For a successful technology,", 3);
      simpleText(-58, 0.1, 15, "reality must take precedence", 3);
      simpleText(-58, 0.1, 21, "over public relations,", 3);
      simpleText(-58, 0.1, 27, "for nature cannot be fooled.", 3);
       simpleText(-58, 0.1, 34, "― Richard P. Feynman", 3.5);

    wallOfBricks();
    wallOfBricks2();
    createTriangle(33, -55);
    createTriangle(33, -51);
    createTriangle(33, -47);
    createTriangle(33, -43);
    createBasketBall2();
    createBasketBall3();
    createBasketBall4();
    createBasketBall5();
    createBasketBall6();
    createBasketBall7();
    addParticles();
    glowingParticles();
createBeachBall2();
createBeachBall3();
    setupEventHandlers();
    renderFrame();
  }

  //check if user's browser has WebGL capabilities
  if (WEBGL.isWebGLAvailable()) {
    start();
  } else {
    noWebGL();
  }
});
