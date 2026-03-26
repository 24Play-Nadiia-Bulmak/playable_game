import * as THREE from 'three';
import { Delegate } from "@24tools/playable_template";
import { Object3D } from "three";
import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { RotationC } from "../Movment/RotationC";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { IState } from "./StateMachine";
import { VfxSpawner } from "../Prop/VfxSpawner";
import { CameraC } from "../../CameraC";

export class AttackState implements IState {
    public static readonly ATTACK_RADIUS = 16;

    private _isReady: boolean = false;

    private _isWeaponDrawn: boolean = false;
    private _isShooting: boolean = false;
    private _isInLoopMode: boolean = false;
    private _shootTimer: number = 0;
    private readonly _shootInterval: number = 0.25;
    private _lastAnim: BaseAnimation | null = null;
    private _lastBlendDirAnim: BaseAnimation | null = null;
    private _blendShootTimer: number = 0;
    private _shootAnimDuration: number = 0;
    private readonly _shootBlendSpeed: number = 2.0;
    private _onTakeOutFinishDelegate: Delegate<{}>;
    private _onShootLoopDelegate: Delegate<{}>

    constructor(
        private character: Character,
        private rotation: RotationC,
        private container: Object3D,
        private getDirection: () => THREE.Vector3,
        private onShoot?: () => void,
    ) {
        this._onTakeOutFinishDelegate = new Delegate<{}>(() => {
            this._isReady = true;
            this._lastAnim = null;
            this._shootTimer = this._shootInterval;
            this.character.onAnimFinish.removeListeners(this._onTakeOutFinishDelegate);
        });

        this._onShootLoopDelegate = new Delegate<{}>(() => {
            this.onShoot?.();
            this._spawnShootVfx();
        });
    }

    onEnter() {
        const targetPos = TriggerSystem.getNearestActivePosition("npc");
        const targetInRange = !!targetPos && this.container.position.distanceTo(targetPos) <= AttackState.ATTACK_RADIUS;
        if (!targetInRange) return;

        this._isShooting = false;
        this._isInLoopMode = false;
        this._shootTimer = 0;
        this._lastAnim = null;
        this.rotation.enabled = false;

        if (this._isWeaponDrawn) {
            this._isReady = true;
            this._shootTimer = this._shootInterval;
        } else {
            this._isReady = false;
            this._isWeaponDrawn = true; // mark weapon as being drawn immediately
            this.character.playAnimation(BaseAnimation.WeaponTakeOut, true, 0.01);
            this.character.AnimationSpeed = 2;
            this.character.onAnimFinish.addListener(this._onTakeOutFinishDelegate);

            const drawDir = this.getDirection();
            if (drawDir.length() >= 0.01) {
                const dirAnim = this._getDirectionalAnim(drawDir.clone().normalize());
                this.character.updateOverlayAnimation(dirAnim, 1, 0.1);
                this.character.setBlendedAnimSpeed(dirAnim, 1.5);
            }
        }
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", true);
        this.character.setPartVisible("Weapon_Back", true);
    }

    onUpdate(delta: number) {
        this.rotation.lookAtTarget = TriggerSystem.getNearestActivePosition("npc");

        if (!this._isReady) {
            const drawDir = this.getDirection();
            if (drawDir.length() >= 0.01) {
                const dirAnim = this._getDirectionalAnim(drawDir.clone().normalize());
                this.character.updateOverlayAnimation(dirAnim, 1, 0.1);
                this.character.setBlendedAnimSpeed(dirAnim, 1.5);
            } else {
                this.character.stopOverlayAnimations(0.15);
            }
            return;
        }

        const dir = this.getDirection();
        const isStopped = dir.length() < 0.01;

        if (this._isShooting) {
            if (isStopped) {
                this._isShooting = false;
                this._lastBlendDirAnim = null;
                this._lastAnim = null;
                this._enterLoopShootMode();
                return;
            }

            this._blendShootTimer += delta;
            if (this._blendShootTimer >= this._shootAnimDuration) {
                this._isShooting = false;
                const prevDirAnim = this._lastBlendDirAnim;
                this._lastBlendDirAnim = null;
                if (prevDirAnim !== null) {
                    
                    this.character.playBlendedAnimations([{ animId: prevDirAnim, weight: 1 }], 0.15);
                    this.character.setBlendedAnimSpeed(prevDirAnim, 1.5);
                    this._lastAnim = prevDirAnim;
                } else {
                    this._lastAnim = null;
                }
            }
            return;
        }

        if (isStopped) {
            if (!this._isInLoopMode) {
                this._enterLoopShootMode();
                
            }
            return;
        }

        if (this._isInLoopMode) {
            this._exitLoopShootMode();
        }

        this._shootTimer += delta;
        if (this._shootTimer >= this._shootInterval) {
            this._shootTimer = 0;
            this._isShooting = true;
            this._blendShootTimer = 0;
            this._lastAnim = null;

            this._shootAnimDuration = this.character.animationList[BaseAnimation.PistolShoot].duration / this._shootBlendSpeed;

            const norm = dir.clone().normalize();
            const dirAnim = this._getDirectionalAnim(norm);
            this._lastBlendDirAnim = dirAnim;
            this.character.playBlendedAnimations([
                { animId: BaseAnimation.PistolShoot, weight: 0.45 },
                { animId: dirAnim, weight: 1 },
            ], 0.1);
            this.character.setBlendedAnimSpeed(BaseAnimation.PistolShoot, this._shootBlendSpeed);
            this.character.setBlendedAnimSpeed(dirAnim, 1.5);
            this.onShoot?.();
            this._spawnShootVfx();
            return;
        }

        const norm = dir.clone().normalize();
        const dirAnim = this._getDirectionalAnim(norm);
        this._updateDirectionalBlend(dirAnim);
        this.character.setPartVisible("Character_Pistol", true);
    }

    onExit() {
        this.character.onAnimFinish.removeListeners(this._onTakeOutFinishDelegate);
        if (this._isInLoopMode) {
            this._exitLoopShootMode();
        }

        const targetPos = TriggerSystem.getNearestActivePosition("npc");
        const targetInRange = !!targetPos && this.container.position.distanceTo(targetPos) <= AttackState.ATTACK_RADIUS;

        if (this._isWeaponDrawn && !targetInRange) {
            this.character.playAnimation(BaseAnimation.WeaponPutDown, true);
            const putDownDir = this.getDirection();
            if (putDownDir.length() >= 0.01) {
                const dirAnim = this._getDirectionalAnim(putDownDir.clone().normalize());
                this.character.updateOverlayAnimation(dirAnim, 1, 0.1);
                this.character.setBlendedAnimSpeed(dirAnim, 1.5);
            }
            this._isWeaponDrawn = false;
            this._isReady = false;
        }

        this.rotation.lookAtTarget = null;
        this.rotation.enabled = true;
        this._lastAnim = null;
        this._lastBlendDirAnim = null;
        this.character.setPartVisible("Weapon_Hand", false);
        if (!this._isWeaponDrawn) {
            this.character.setPartVisible("Character_Pistol", false);
        }
        this.character.setPartVisible("Weapon_Back", true);
    }

    private _enterLoopShootMode() {
        this._isInLoopMode = true;
        this._lastAnim = null;
        this.character.playAnimation(BaseAnimation.PistolShoot, false, 0.25);
        this.character.AnimationSpeed = 1.4;
        this.character.onAnimLoop.addListener(this._onShootLoopDelegate);
    }

    private _exitLoopShootMode() {
        this._isInLoopMode = false;
        this.character.onAnimLoop.removeListeners(this._onShootLoopDelegate);
        this._lastAnim = null;
        this._shootTimer = this._shootInterval * 0.5;
    }

    private _spawnShootVfx(): void {
        const targetPos = TriggerSystem.getNearestActivePosition("npc");
        if (targetPos) VfxSpawner.spawnShootEffect(targetPos);
        CameraC.shake(0.1, 0.05);
    }

    private _getDirectionalAnim(norm: THREE.Vector3): BaseAnimation {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.container.quaternion);
        const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(this.container.quaternion);
        const fwdDot   = norm.dot(forward);
        const rightDot = norm.dot(right);
        if (fwdDot > 0.5) return BaseAnimation.PistolForward;
        if (fwdDot < -0.5) return BaseAnimation.PistolBack;
        return rightDot >= 0 ? BaseAnimation.PistolLeft : BaseAnimation.PistolRight;
    }

    private playIfChanged(anim: BaseAnimation) {
        if (this._lastAnim !== anim) {
            this._lastAnim = anim;
            this.character.playAnimation(anim, false, 0.25);
            this.character.AnimationSpeed = 1.5;
        }
    }

    private _updateDirectionalBlend(dirAnim: BaseAnimation) {
        if (this._lastAnim === dirAnim) return;
        this._lastAnim = dirAnim;
        this.character.playBlendedAnimations([{ animId: dirAnim, weight: 1 }], 0.15);
        this.character.setBlendedAnimSpeed(dirAnim, 1.5);
    }
}