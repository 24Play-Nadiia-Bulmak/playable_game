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
    /** Radial distance (metres) within which a target must be present to initiate or sustain the combat loop. */
    public static readonly ATTACK_RADIUS = 16;

    private _isReady: boolean = false;
    /**
     * True from the moment WeaponTakeOut begins until WeaponPutDown finishes.
     * Persists across re-entries so the draw animation is not replayed when the
     * player briefly leaves combat state while the target is still in range.
     */
    private _isWeaponDrawn: boolean = false;
    private _isShooting: boolean = false;
    /** True while the looping stopped-combat shoot mode is active. */
    private _isInLoopMode: boolean = false;
    private _shootTimer: number = 0;
    private readonly _shootInterval: number = 0.25; // time between shots while moving (seconds)
    private _lastAnim: BaseAnimation | null = null;
    /** Directional anim currently active inside the blend-shoot pair; null when not in blend-shoot mode. */
    private _lastBlendDirAnim: BaseAnimation | null = null;
    /** Elapsed time (seconds) since the current blend-shoot started while moving. */
    private _blendShootTimer: number = 0;
    /** Expected duration of one PistolShoot cycle at the current playback speed. */
    private _shootAnimDuration: number = 0;
    /** Playback speed applied to PistolShoot inside the move-blend (must match _shootAnimDuration calc). */
    private readonly _shootBlendSpeed: number = 2.0;
    private _onTakeOutFinishDelegate: Delegate<{}>;
    /** Fires onShoot once per completed PistolShoot loop cycle (stationary combat mode). */
    private _onShootLoopDelegate: Delegate<{}>

    constructor(
        private character: Character,
        private rotation: RotationC,
        private container: Object3D,
        private getDirection: () => THREE.Vector3,
        /** Called once per shot at the moment the PistolShoot animation starts — use for damage / hitscan. */
        private onShoot?: () => void,
    ) {
        // Unlocks the combat loop once WeaponTakeOut completes.
        this._onTakeOutFinishDelegate = new Delegate<{}>(() => {
            this._isReady = true;
            this._lastAnim = null;
            this._shootTimer = this._shootInterval; // fire immediately on the first ready frame
            this.character.onAnimFinish.removeListeners(this._onTakeOutFinishDelegate);
        });

        this._onShootLoopDelegate = new Delegate<{}>(() => {
            this.onShoot?.();
            this._spawnShootVfx();
        });
    }

    onEnter() {
        // Guard: only enter the combat loop when a target is within ATTACK_RADIUS.
        const targetPos = TriggerSystem.getNearestActivePosition("npc");
        const targetInRange = !!targetPos && this.container.position.distanceTo(targetPos) <= AttackState.ATTACK_RADIUS;
        if (!targetInRange) return;

        this._isShooting = false;
        this._isInLoopMode = false;
        this._shootTimer = 0;
        this._lastAnim = null;
        this.rotation.enabled = false;

        if (this._isWeaponDrawn) {
            // Weapon is already in hand — skip WeaponTakeOut to avoid animation snapping on re-entry.
            this._isReady = true;
            this._shootTimer = this._shootInterval;
        } else {
            // First entry — play the draw sequence.
            this._isReady = false;
            this._isWeaponDrawn = true; // mark weapon as being drawn immediately
            this.character.playAnimation(BaseAnimation.WeaponTakeOut, true, 0.01);
            this.character.AnimationSpeed = 2;
            this.character.onAnimFinish.addListener(this._onTakeOutFinishDelegate);

            // If the joystick is already active, overlay the directional anim so the
            // body keeps moving instead of freezing during the draw animation.
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
            // Keep the directional overlay in sync while WeaponTakeOut is playing.
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

            // Do not interrupt the blend mid-cycle — let PistolShoot play to completion.
            // Direction is sampled once at the start of each cycle (see below).
            this._blendShootTimer += delta;
            if (this._blendShootTimer >= this._shootAnimDuration) {
                this._isShooting = false;
                const prevDirAnim = this._lastBlendDirAnim;
                this._lastBlendDirAnim = null;
                // Fade out PistolShoot but keep the directional anim alive in the blend map
                // so it continues from its current time instead of snapping back to frame 0.
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

            // _shootBlendSpeed is the actual timeScale applied to PistolShoot inside the blend.
            // Using _shootInterval here was a bug: it made _shootAnimDuration 4× too long.
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

        // Only holster the weapon when the target has left combat range.
        // If the target is still nearby, keep the weapon drawn so re-entry is instant.
        const targetPos = TriggerSystem.getNearestActivePosition("npc");
        const targetInRange = !!targetPos && this.container.position.distanceTo(targetPos) <= AttackState.ATTACK_RADIUS;

        if (this._isWeaponDrawn && !targetInRange) {
            this.character.playAnimation(BaseAnimation.WeaponPutDown, true);
            // Overlay directional movement so the body keeps walking during holster.
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
        // Keep the pistol visible while the weapon is still drawn (target in range).
        if (!this._isWeaponDrawn) {
            this.character.setPartVisible("Character_Pistol", false);
        }
        this.character.setPartVisible("Weapon_Back", true);
    }

    /** Starts the stationary looping shoot mode. PistolShoot plays on a loop; onShoot fires on each cycle. */
    private _enterLoopShootMode() {
        this._isInLoopMode = true;
        this._lastAnim = null;
        this.character.playAnimation(BaseAnimation.PistolShoot, false, 0.25);
        this.character.AnimationSpeed = 1.4;
        this.character.onAnimLoop.addListener(this._onShootLoopDelegate);
    }

    /** Exits loop shoot mode and primes the timer so the first shot while moving isn't delayed. */
    private _exitLoopShootMode() {
        this._isInLoopMode = false;
        this.character.onAnimLoop.removeListeners(this._onShootLoopDelegate);
        this._lastAnim = null;
        this._shootTimer = this._shootInterval * 0.5;
    }

    /** Spawns a hit VFX at the current target NPC position each time the player fires. */
    private _spawnShootVfx(): void {
        const targetPos = TriggerSystem.getNearestActivePosition("npc");
        if (targetPos) VfxSpawner.spawnShootEffect(targetPos);
        CameraC.shake(0.1, 0.05);
    }

    /** Returns the directional pistol locomotion animation matching the given normalised movement vector. */
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
            // Directional pistol locomotion plays at 1.5× speed to feel snappier.
            this.character.AnimationSpeed = 1.5;
        }
    }

    /**
     * Updates the active directional blend during the between-shots phase.
     * Reuses the existing blend-map entry when direction is unchanged (no reset, no snap),
     * and smoothly cross-fades to the new direction when it changes.
     */
    private _updateDirectionalBlend(dirAnim: BaseAnimation) {
        if (this._lastAnim === dirAnim) return;
        this._lastAnim = dirAnim;
        this.character.playBlendedAnimations([{ animId: dirAnim, weight: 1 }], 0.15);
        this.character.setBlendedAnimSpeed(dirAnim, 1.5);
    }
}