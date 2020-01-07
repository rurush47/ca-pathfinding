import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import { Scene, Renderer, PerspectiveCamera, WebGLRenderer, PlaneGeometry, MeshBasicMaterial, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import ModelLoader from './modelLoader'
import Grid from './grid';
import InputController from './inputController';
import Soldier from './soldier';

var scene: Scene;
var renderer: WebGLRenderer;
var camera: PerspectiveCamera;
var stats;
var model, skeleton, mixer, clock;
var crossFadeControls = [];
var idleAction, walkAction, runAction;
var idleWeight, walkWeight, runWeight;
var actions, settings;
var singleStepMode = false;
var sizeOfNextStep = 0;
var mouse = new THREE.Vector2();
var inputController : InputController;
var models : Array<Soldier> = Array();

init();

function init() {
    var container = document.getElementById('container');
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(1, 2, - 3);
    camera.lookAt(0, 1, 0);
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    //scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);
    var hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    var dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(- 3, 10, - 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = - 2;
    dirLight.shadow.camera.left = - 2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    scene.add(dirLight);
    //scene.add( new CameraHelper( light.shadow.camera ) );
    // ground
    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(100, 100), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    var modelLoader: ModelLoader;
    modelLoader = new ModelLoader('resources/Soldier.glb', function loadModel(gltf) {
        return new Promise(resolve => {
            model = gltf.scene;
            scene.add( model );
            model.traverse( function ( object ) {
                if ( object.isMesh ) object.castShadow = true;
            } );
            //
            skeleton = new THREE.SkeletonHelper( model );
            skeleton.visible = false;
            scene.add( skeleton );

            model.translateX(3);

            var animations = gltf.animations;
            mixer = new THREE.AnimationMixer(model);
            idleAction = mixer.clipAction(animations[0]);
            walkAction = mixer.clipAction(animations[3]);
            runAction = mixer.clipAction(animations[1]);
            actions = [idleAction, walkAction, runAction];

            createPanel();
            activateAllActions();
            animate();
        });
    })

    var sold = new Soldier();
    sold.init((soldier : Soldier) => 
    {
        scene.add(soldier.model);
        scene.add(soldier.skeleton);
        models.push(soldier);
    });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer. = true;
    renderer.gammaFactor = 2.2;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    addOrbitControl();
    addGrid();

    inputController = new InputController(grid);

    stats = Stats();
    container.appendChild(stats.dom);

    document.addEventListener('mousemove', onDocumentMouseMove, false );
    document.addEventListener('mousedown', onDocumentMouseDown, false );
    document.addEventListener('keydown', onDocumentKeyDown, false);
    window.addEventListener('resize', onWindowResize, false);
    //window.requestAnimationFrame(animate);
}

function addOrbitControl() {
    var controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.5;
    //controls.minDistance = 1000;
    //controls.maxDistance = 5000;
}

var grid : Grid;

function addGrid() 
{
    grid = new Grid(10, 1);
    scene.add(grid.treeObj);
}

function createPanel() {
    var panel = new GUI({ width: 310 });
    var folder1 = panel.addFolder('Visibility');
    var folder2 = panel.addFolder('Activation/Deactivation');
    var folder3 = panel.addFolder('Pausing/Stepping');
    var folder4 = panel.addFolder('Crossfading');
    var folder5 = panel.addFolder('Blend Weights');
    var folder6 = panel.addFolder('General Speed');
    settings = {
        'show model': true,
        'show skeleton': false,
        'deactivate all': deactivateAllActions,
        'activate all': activateAllActions,
        'pause/continue': pauseContinue,
        'make single step': toSingleStepMode,
        'modify step size': 0.05,
        'from walk to idle': function () {
            prepareCrossFade(walkAction, idleAction, 1.0);
        },
        'from idle to walk': function () {
            prepareCrossFade(idleAction, walkAction, 0.5);
        },
        'from walk to run': function () {
            prepareCrossFade(walkAction, runAction, 2.5);
        },
        'from run to walk': function () {
            prepareCrossFade(runAction, walkAction, 5.0);
        },
        'use default duration': true,
        'set custom duration': 3.5,
        'modify idle weight': 0.0,
        'modify walk weight': 1.0,
        'modify run weight': 0.0,
        'modify time scale': 1.0
    };
    folder1.add(settings, 'show model').onChange(showModel);
    folder1.add(settings, 'show skeleton').onChange(showSkeleton);
    folder2.add(settings, 'deactivate all');
    folder2.add(settings, 'activate all');
    folder3.add(settings, 'pause/continue');
    folder3.add(settings, 'make single step');
    folder3.add(settings, 'modify step size', 0.01, 0.1, 0.001);
    crossFadeControls.push(folder4.add(settings, 'from walk to idle'));
    crossFadeControls.push(folder4.add(settings, 'from idle to walk'));
    crossFadeControls.push(folder4.add(settings, 'from walk to run'));
    crossFadeControls.push(folder4.add(settings, 'from run to walk'));
    folder4.add(settings, 'use default duration');
    folder4.add(settings, 'set custom duration', 0, 10, 0.01);
    folder5.add(settings, 'modify idle weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
        setWeight(idleAction, weight);
    });
    folder5.add(settings, 'modify walk weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
        setWeight(walkAction, weight);
    });
    folder5.add(settings, 'modify run weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
        setWeight(runAction, weight);
    });
    folder6.add(settings, 'modify time scale', 0.0, 1.5, 0.01).onChange(modifyTimeScale);
    folder1.open();
    folder2.open();
    folder3.open();
    folder4.open();
    folder5.open();
    folder6.open();
    crossFadeControls.forEach(function (control) {
        control.classList1 = control.domElement.parentElement.parentElement.classList;
        control.classList2 = control.domElement.previousElementSibling.classList;
        control.setDisabled = function () {
            control.classList1.add('no-pointer-events');
            control.classList2.add('control-disabled');
        };
        control.setEnabled = function () {
            control.classList1.remove('no-pointer-events');
            control.classList2.remove('control-disabled');
        };
    });
}

function showModel(visibility) {
    model.visible = visibility;
}

function showSkeleton(visibility) {
    skeleton.visible = visibility;
}

function modifyTimeScale(speed) {
    mixer.timeScale = speed;
}

function deactivateAllActions() {
    actions.forEach(function (action) {
        action.stop();
    });
}

function activateAllActions() {
    setWeight(idleAction, settings['modify idle weight']);
    setWeight(walkAction, settings['modify walk weight']);
    setWeight(runAction, settings['modify run weight']);
    actions.forEach(function (action) {
        action.play();
    });
}

function pauseContinue() {
    if (singleStepMode) {
        singleStepMode = false;
        unPauseAllActions();
    } else {
        if (idleAction.paused) {
            unPauseAllActions();
        } else {
            pauseAllActions();
        }
    }
}

function pauseAllActions() {
    actions.forEach(function (action) {
        action.paused = true;
    });
}

function unPauseAllActions() {
    actions.forEach(function (action) {
        action.paused = false;
    });
}

function toSingleStepMode() {
    unPauseAllActions();
    singleStepMode = true;
    sizeOfNextStep = settings['modify step size'];
}

function prepareCrossFade(startAction, endAction, defaultDuration) {
    // Switch default / custom crossfade duration (according to the user's choice)
    var duration = setCrossFadeDuration(defaultDuration);
    // Make sure that we don't go on in singleStepMode, and that all actions are unpaused
    singleStepMode = false;
    unPauseAllActions();
    // If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    if (startAction === idleAction) {
        executeCrossFade(startAction, endAction, duration);
    } else {
        synchronizeCrossFade(startAction, endAction, duration);
    }
}

function setCrossFadeDuration(defaultDuration) {
    // Switch default crossfade duration <-> custom crossfade duration
    if (settings['use default duration']) {
        return defaultDuration;
    } else {
        return settings['set custom duration'];
    }
}

function synchronizeCrossFade(startAction, endAction, duration) {
    mixer.addEventListener('loop', onLoopFinished);
    function onLoopFinished(event) {
        if (event.action === startAction) {
            mixer.removeEventListener('loop', onLoopFinished);
            executeCrossFade(startAction, endAction, duration);
        }
    }
}

function executeCrossFade(startAction, endAction, duration) {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    setWeight(endAction, 1);
    endAction.time = 0;
    // Crossfade with warping - you can also try without warping by setting the third parameter to false
    startAction.crossFadeTo(endAction, duration, true);
}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))
function setWeight(action, weight) {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
}

// Called by the render loop
function updateWeightSliders() {
    settings['modify idle weight'] = idleWeight;
    settings['modify walk weight'] = walkWeight;
    settings['modify run weight'] = runWeight;
}

// Called by the render loop
function updateCrossFadeControls() {
    crossFadeControls.forEach(function (control) {
        control.setDisabled();
    });
    if (idleWeight === 1 && walkWeight === 0 && runWeight === 0) {
        crossFadeControls[1].setEnabled();
    }
    if (idleWeight === 0 && walkWeight === 1 && runWeight === 0) {
        crossFadeControls[0].setEnabled();
        crossFadeControls[2].setEnabled();
    }
    if (idleWeight === 0 && walkWeight === 0 && runWeight === 1) {
        crossFadeControls[3].setEnabled();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    // Render loop
    requestAnimationFrame(animate);

    var delta = clock.getDelta();

    models.forEach(model => {
        model.update(delta);
    });

    idleWeight = idleAction.getEffectiveWeight();
    walkWeight = walkAction.getEffectiveWeight();
    runWeight = runAction.getEffectiveWeight();
    // Update the panel values if weights are modified from "outside" (by crossfadings)
    updateWeightSliders();
    // Enable/disable crossfade controls according to current weight values
    updateCrossFadeControls();
    // Get the time elapsed since the last frame, used for mixer update (if not in single step mode)
    // If in single step mode, make one step and then do nothing (until the user clicks again)
    if ( singleStepMode ) {
        delta = sizeOfNextStep;
        sizeOfNextStep = 0;
    }
    // Update the animation mixer, the stats panel, and render this frame
    mixer.update( delta );
    stats.update();

    mouseInteract();

    renderer.render(scene, camera);
}

function onDocumentKeyDown(event) 
{
    var keyCode = event.which;
    if(keyCode == 74)
    {
        models[0].setTarget();
    }
}

function onDocumentMouseMove( event ) {
    // calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components
    event.preventDefault();

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function mouseInteract() 
{
    inputController.mouseInteract(mouse, camera);
}

function onDocumentMouseDown()
{
    inputController.onMouseDown(mouse, camera);
}