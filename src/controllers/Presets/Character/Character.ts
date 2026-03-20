import { EasyEvent } from "@24tools/playable_template";
import { AnimationAction, AnimationClip, AnimationMixer, Color, LoopOnce, LoopRepeat, Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils";
import { ThreeC } from "../../ThreeC";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class Character {
  tObj: Object3D;
  animMixer: AnimationMixer;
  animationList: AnimationClip[] = [];

  // isWalking: boolean = false;
  curClipAction: null | AnimationAction = null;
  animStopTimeout: null | NodeJS.Timeout = null

  onAnimLoop: EasyEvent<{}> = new EasyEvent<{}>();
  onAnimFinish: EasyEvent<{}> = new EasyEvent<{}>();

  constructor(prefab: GLTF, start_position = new Vector3()) {
    let tObj = clone(prefab.scene);

    tObj.castShadow = true;
    let animMixer = new AnimationMixer(tObj);

    animMixer.addEventListener('loop', () => {
      this.onAnimLoop.Invoke({});
    });
    animMixer.addEventListener('finished', () => {
      this.onAnimFinish.Invoke({});
    });

    if (start_position) tObj.position.copy(start_position);

    this.tObj = tObj;
    this.animMixer = animMixer;
    this.animationList = prefab.animations;

    ThreeC.addToScene(tObj);
    ThreeC.addAnimMixer(animMixer);
// console.log(this.animationList);
    return this;
  }

  set AnimationSpeed(timeScale: number) {
    if (this.curClipAction)
      this.curClipAction.timeScale = timeScale;
  }

  set AnimationWeight(weight: number) {
    if (this.curClipAction)
      this.curClipAction.weight = weight;
  }

  playAnimation(anim_id: number, one_time: boolean = false, fade = 0.25, randomStart = false) {
    let oldClipAction: null | AnimationAction = this.curClipAction;
    var clipAction = this.animMixer.clipAction(this.animationList[anim_id]);
    

    if (one_time) {
      clipAction.clampWhenFinished = true;
      clipAction.setLoop(LoopOnce, 1);
    }
    else {
      clipAction.clampWhenFinished = false;
      clipAction.setLoop(LoopRepeat,  Infinity);
    }
    clipAction.timeScale = 1;
    clipAction.weight = 1;

    clipAction.reset();
    if (randomStart)
      clipAction.time = Math.random() * this.animationList[anim_id].duration;
    clipAction.play();
    if (oldClipAction && oldClipAction != clipAction)
      oldClipAction.crossFadeTo(clipAction, fade, true);
    this.curClipAction = clipAction;
  }
}