import * as THREE from 'three';
import { Delegate } from "@24tools/playable_template";
import { Object3D } from "three";
import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { RotationC } from "../Movment/RotationC";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { IState } from "./StateMachine";

export class AttackState implements IState {
    private _isReady: boolean = false;
    private _lastAnim: BaseAnimation | null = null;
    private _onFinishDelegate: Delegate<{}>;

    constructor(
        private character: Character,
        private rotation: RotationC,
        private container: Object3D,
        private getDirection: () => THREE.Vector3,
    ) {
        // Callback після завершення WeaponTakeOut — розблоковує атакуючі анімації
        this._onFinishDelegate = new Delegate<{}>(() => {
            this._isReady = true;
            this._lastAnim = null;
            this.character.onAnimFinish.removeListeners(this._onFinishDelegate);
        });
    }

    onEnter() {
        this._isReady = false;
        this._lastAnim = null;
        this.character.playAnimation(BaseAnimation.WeaponTakeOut, true);
        this.character.onAnimFinish.addListener(this._onFinishDelegate);
        this.rotation.enabled = false;
    }

    onUpdate(_delta: number) {
        // Оновлюємо ціль ротейшну кожен кадр — NPC може рухатися
        this.rotation.lookAtTarget = TriggerSystem.getNearestActivePosition("npc");

        // Чекаємо поки WeaponTakeOut не дограє до кінця
        if (!this._isReady) return;

        const dir = this.getDirection();
        const isStopped = dir.length() < 0.01;

        if (isStopped) {
            this.playIfChanged(BaseAnimation.PistolShoot);
            return;
        }

        const norm = dir.clone().normalize();
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.container.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.container.quaternion);
        const fwdDot = norm.dot(forward);
        const rightDot = norm.dot(right);

        let anim: BaseAnimation;
        if (fwdDot > 0.5) {
            anim = BaseAnimation.PistolForward;
        } else if (fwdDot < -0.5) {
            anim = BaseAnimation.PistolBack;
        } else {
            anim = rightDot >= 0 ? BaseAnimation.PistolLeft : BaseAnimation.PistolRight;
        }

        this.playIfChanged(anim);
    }

    onExit() {
        this.character.onAnimFinish.removeListeners(this._onFinishDelegate);
        this.character.playAnimation(BaseAnimation.WeaponPutDown, true);
        this.rotation.lookAtTarget = null;
        this.rotation.enabled = true;
        this._lastAnim = null;
    }

    private playIfChanged(anim: BaseAnimation) {
        if (this._lastAnim !== anim) {
            this._lastAnim = anim;
            this.character.playAnimation(anim);
        }
    }
}