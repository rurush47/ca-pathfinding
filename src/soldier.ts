import { Object3D, SkeletonHelper, AnimationMixer, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import TWEEN from '@tweenjs/tween.js';

export default class Soldier
{
    model : Object3D;
    skeleton;
    mixer;
    idleAction;
    walkAction;
    runAction;
    idleWeight;
    walkWeight;
    runWeight;
    actions;
    loader : GLTFLoader;
    settings;
    crossFadeControls = [];
    singleStepMode = false;
    sizeOfNextStep = 0;

    currentPosition : Vector3 = new Vector3(0, 0, 0);
    velocity : Vector3 = new Vector3(0, 0, 0);
    maxVelocity : number = 1;
    maxForce : number = 1;
    maxSpeed : number = 1;

    constructor()
    {
        
    }

    init(onComplete : (solder) => void)
    {
        this.loader = new GLTFLoader();
        this.loader.load('resources/Soldier.glb', (gltf) => this.loadModel(gltf, this, onComplete));
    }
    
    loadModel(gltf, sold, onComplete)
    {
        sold.model = gltf.scene;
        //scene.add( this.model );
        sold.model.traverse( function ( object ) {
            if ( object.isMesh ) object.castShadow = true;
        });
        //
        sold.skeleton = new SkeletonHelper(sold.model);
        sold.skeleton.visible = false;
        //scene.add( skeleton );

        var animations = gltf.animations;
        sold.mixer = new AnimationMixer(sold.model);
        sold.idleAction = sold.mixer.clipAction(animations[0]);
        sold.walkAction = sold.mixer.clipAction(animations[3]);
        sold.runAction = sold.mixer.clipAction(animations[1]);
        sold.actions = [sold.idleAction, sold.walkAction, sold.runAction];

        sold.showModel(true);
        //this.createPanel();
        sold.createSettings();
        sold.activateAllActions();
        //createPanel();
        //activateAllActions();
        //animate();
        sold.model.translateX(-1);

        onComplete(this);
    }

    setTarget() : void 
    {
        const coords = { x: 0, y: 0 }; // Start at (0, 0)
        const tween = new TWEEN.Tween(coords) // Create a new tween that modifies 'coords'.
        .to({ x: 300, y: 200 }, 1000) // Move to (300, 200) in 1 second.
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => { // Called after tween.js updates 'coords'.
            // Move 'box' to the position described by 'coords' with a CSS translation.
            this.currentPosition.set(coords.x, 0, coords.y);
            console.log("xd");
        })
        .start();
    }

    target : Vector3 = new Vector3(5, 0, 0);
    elapsedTime : number = 0;
    
    movementUpdate(deltaTime)
    {
        this.elapsedTime += deltaTime;
        TWEEN.update(this.elapsedTime);

        if(this.currentPosition.clone().distanceTo(this.target) < 0.1)
        {
            return;
        }

        var desiredVelocity = (this.target.clone().sub(this.currentPosition)).normalize().multiplyScalar(this.maxVelocity);
        var steering = desiredVelocity.clone().sub(this.velocity);

        steering = steering.clampLength(0, this.maxForce);
        this.velocity = (this.velocity.clone().add(steering)).clampLength(0, this.maxSpeed).multiplyScalar(deltaTime);
        this.currentPosition.add(this.velocity);
        this.model.position.set(this.currentPosition.x, this.currentPosition.y, this.currentPosition.z);

        this.model.lookAt(this.velocity);
    }

    update(deltaTime) : void
    {
        this.movementUpdate(deltaTime);

        this.idleWeight = this.idleAction.getEffectiveWeight();
        this.walkWeight = this.walkAction.getEffectiveWeight();
        this.runWeight = this.runAction.getEffectiveWeight();
        // Update the panel values if weights are modified from "outside" (by crossfadings)
        this.updateWeightSliders();
        // Enable/disable crossfade controls according to current weight values
        //this.updateCrossFadeControls();

        // Get the time elapsed since the last frame, used for mixer update (if not in single step mode)
        var mixerUpdateDelta = deltaTime;
        // If in single step mode, make one step and then do nothing (until the user clicks again)
        if (this.singleStepMode) {
            mixerUpdateDelta = this.sizeOfNextStep;
            this.sizeOfNextStep = 0;
        }
        // Update the animation mixer, the stats panel, and render this frame
        this.mixer.update(mixerUpdateDelta);
    }

    createSettings()
    {
        this.settings = {
            'show model': true,
            'show skeleton': false,
            'deactivate all': this.deactivateAllActions,
            'activate all': this.activateAllActions,
            'pause/continue': this.pauseContinue,
            'make single step': this.toSingleStepMode,
            'modify step size': 0.05,
            'from walk to idle': function () {
                this.prepareCrossFade(this.walkAction, this.idleAction, 1.0);
            },
            'from idle to walk': function () {
                this.prepareCrossFade(this.idleAction, this.walkAction, 0.5);
            },
            'from walk to run': function () {
                this.prepareCrossFade(this.walkAction, this.runAction, 2.5);
            },
            'from run to walk': function () {
                this.prepareCrossFade(this.runAction, this.walkAction, 5.0);
            },
            'use default duration': true,
            'set custom duration': 3.5,
            'modify idle weight': 0.0,
            'modify walk weight': 1.0,
            'modify run weight': 0.0,
            'modify time scale': 1.0
        };   
    }

    createPanel() {
        var panel = new GUI({ width: 310 });
        var folder1 = panel.addFolder('Visibility');
        var folder2 = panel.addFolder('Activation/Deactivation');
        var folder3 = panel.addFolder('Pausing/Stepping');
        var folder4 = panel.addFolder('Crossfading');
        var folder5 = panel.addFolder('Blend Weights');
        var folder6 = panel.addFolder('General Speed');

        this.createSettings();

        folder1.add(this.settings, 'show model').onChange(this.showModel);
        folder1.add(this.settings, 'show skeleton').onChange(this.showSkeleton);
        folder2.add(this.settings, 'deactivate all');
        folder2.add(this.settings, 'activate all');
        folder3.add(this.settings, 'pause/continue');
        folder3.add(this.settings, 'make single step');
        folder3.add(this.settings, 'modify step size', 0.01, 0.1, 0.001);
        this.crossFadeControls.push(folder4.add(this.settings, 'from walk to idle'));
        this.crossFadeControls.push(folder4.add(this.settings, 'from idle to walk'));
        this.crossFadeControls.push(folder4.add(this.settings, 'from walk to run'));
        this.crossFadeControls.push(folder4.add(this.settings, 'from run to walk'));
        folder4.add(this.settings, 'use default duration');
        folder4.add(this.settings, 'set custom duration', 0, 10, 0.01);
        folder5.add(this.settings, 'modify idle weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
            this.setWeight(this.idleAction, weight);
        });
        folder5.add(this.settings, 'modify walk weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
            this.setWeight(this.walkAction, weight);
        });
        folder5.add(this.settings, 'modify run weight', 0.0, 1.0, 0.01).listen().onChange(function (weight) {
            this.setWeight(this.runAction, weight);
        });
        folder6.add(this.settings, 'modify time scale', 0.0, 1.5, 0.01).onChange(this.modifyTimeScale);
        folder1.open();
        folder2.open();
        folder3.open();
        folder4.open();
        folder5.open();
        folder6.open();
        this.crossFadeControls.forEach(function (control) {
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

showModel(visibility) {
    this.model.visible = visibility;
}

showSkeleton(visibility) {
    this.skeleton.visible = visibility;
}

modifyTimeScale(speed) {
    this.mixer.timeScale = speed;
}

deactivateAllActions() {
    this.actions.forEach(function (action) {
        action.stop();
    });
}

activateAllActions() {
    this.setWeight(this.idleAction, this.settings['modify idle weight']);
    this.setWeight(this.walkAction, this.settings['modify walk weight']);
    this.setWeight(this.runAction, this.settings['modify run weight']);
    this.actions.forEach(function (action) {
        action.play();
    });
}

pauseContinue() {
    if (this.singleStepMode) {
        this.singleStepMode = false;
        this.unPauseAllActions();
    } else {
        if (this.idleAction.paused) {
            this.unPauseAllActions();
        } else {
            this.pauseAllActions();
        }
    }
}

pauseAllActions() {
    this.actions.forEach(function (action) {
        action.paused = true;
    });
}

unPauseAllActions() {
    this.actions.forEach(function (action) {
        action.paused = false;
    });
}

toSingleStepMode() {
    this.unPauseAllActions();
    this.singleStepMode = true;
    this.sizeOfNextStep = this.settings['modify step size'];
}

prepareCrossFade(startAction, endAction, defaultDuration) {
    // Switch default / custom crossfade duration (according to the user's choice)
    var duration = this.setCrossFadeDuration(defaultDuration);
    // Make sure that we don't go on in singleStepMode, and that all actions are unpaused
    this.singleStepMode = false;
    this.unPauseAllActions();
    // If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    if (startAction === this.idleAction) {
        this.executeCrossFade(startAction, endAction, duration);
    } else {
        this.synchronizeCrossFade(startAction, endAction, duration);
    }
}

setCrossFadeDuration(defaultDuration) {
    // Switch default crossfade duration <-> custom crossfade duration
    if (this.settings['use default duration']) {
        return defaultDuration;
    } else {
        return this.settings['set custom duration'];
    }
}

synchronizeCrossFade(startAction, endAction, duration) {
    this.mixer.addEventListener('loop', onLoopFinished);
    function onLoopFinished(event) {
        if (event.action === startAction) {
            this.mixer.removeEventListener('loop', onLoopFinished);
            this.executeCrossFade(startAction, endAction, duration);
        }
    }
}

executeCrossFade(startAction, endAction, duration) {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    this.setWeight(endAction, 1);
    endAction.time = 0;
    // Crossfade with warping - you can also try without warping by setting the third parameter to false
    startAction.crossFadeTo(endAction, duration, true);
}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))
setWeight(action, weight) {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
}

// Called by the render loop
updateWeightSliders() {
    this.settings['modify idle weight'] = this.idleWeight;
    this.settings['modify walk weight'] = this.walkWeight;
    this.settings['modify run weight'] = this.runWeight;
}

// Called by the render loop
updateCrossFadeControls() {
    this.crossFadeControls.forEach(function (control) {
        control.setDisabled();
    });
    if (this.idleWeight === 1 && this.walkWeight === 0 && this.runWeight === 0) {
        this.crossFadeControls[1].setEnabled();
    }
    if (this.idleWeight === 0 && this.walkWeight === 1 && this.runWeight === 0) {
        this.crossFadeControls[0].setEnabled();
        this.crossFadeControls[2].setEnabled();
    }
    if (this.idleWeight === 0 && this.walkWeight === 0 && this.runWeight === 1) {
        this.crossFadeControls[3].setEnabled();
    }
}
}