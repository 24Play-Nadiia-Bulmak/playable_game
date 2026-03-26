import { EasyEvent } from "@24tools/playable_template";
import { AnimationAction, AnimationClip, AnimationMixer, Color, LoopOnce, LoopRepeat, Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils";
import { ThreeC } from "../../ThreeC";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class Character {
  tObj: Object3D;
  animMixer: AnimationMixer;
  animationList: AnimationClip[] = [];

  curClipAction: null | AnimationAction = null;
  animStopTimeout: null | NodeJS.Timeout = null
  private _blendedActionsMap: Map<number, AnimationAction> = new Map();

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

  setPartVisible(partName: string, visible: boolean) {
    const part = this.tObj.getObjectByName(partName);
    if (part) part.visible = visible;
  }

  playAnimation(anim_id: number, one_time: boolean = false, fade = 0.25, randomStart = false) {
    this._stopAllBlendedActions(fade);
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

  playBlendedAnimations(blends: Array<{ animId: number; weight: number }>, fade = 0.25) {
    if (this.curClipAction) {
      this.curClipAction.fadeOut(fade);
      this.curClipAction = null;
    }

    const newIds = new Set(blends.map(b => b.animId));

    const toRemove: number[] = [];
    for (const [id, action] of this._blendedActionsMap) {
      if (!newIds.has(id)) {
        action.fadeOut(fade);
        toRemove.push(id);
      }
    }
    toRemove.forEach(id => this._blendedActionsMap.delete(id));

    for (const { animId, weight } of blends) {
      let action = this._blendedActionsMap.get(animId);
      if (!action) {
        action = this.animMixer.clipAction(this.animationList[animId]);
        action.clampWhenFinished = false;
        action.setLoop(LoopRepeat, Infinity);
        action.timeScale = 1;
        action.weight = 0.5;
        action.reset();
        action.play();
        action.fadeIn(fade);
        this._blendedActionsMap.set(animId, action);
      }
      action.weight = weight;
    }
  }

  setBlendedAnimSpeed(animId: number, timeScale: number) {
    const action = this._blendedActionsMap.get(animId);
    if (action) action.timeScale = timeScale;
  }

  updateOverlayAnimation(animId: number, weight: number, fade = 0.25): void {
    const toRemove: number[] = [];
    for (const [id, action] of this._blendedActionsMap) {
      if (id !== animId) {
        action.fadeOut(fade);
        toRemove.push(id);
      }
    }
    toRemove.forEach(id => this._blendedActionsMap.delete(id));

    let action = this._blendedActionsMap.get(animId);
    if (!action) {
      action = this.animMixer.clipAction(this.animationList[animId]);
      action.clampWhenFinished = false;
      action.setLoop(LoopRepeat, Infinity);
      action.weight = 0;
      action.reset();
      action.play();
      action.fadeIn(fade);
      this._blendedActionsMap.set(animId, action);
    }
    action.weight = weight;
  }

  stopOverlayAnimations(fade = 0.25): void {
    for (const action of this._blendedActionsMap.values()) {
      action.fadeOut(fade);
    }
    this._blendedActionsMap.clear();
  }

  private _stopAllBlendedActions(fade: number) {
    for (const action of this._blendedActionsMap.values()) {
      action.fadeOut(fade);
    }
    this._blendedActionsMap.clear();
  }
}