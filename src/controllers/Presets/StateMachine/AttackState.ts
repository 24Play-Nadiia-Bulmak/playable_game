import * as THREE from 'three';
import { Delegate } from "@24tools/playable_template";
import { Object3D } from "three";
import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { RotationC } from "../Movment/RotationC";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { IState } from "./StateMachine";

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
    private readonly _shootInterval: number = 1.0;
    private _lastAnim: BaseAnimation | null = null;
    private _onTakeOutFinishDelegate: Delegate<{}>;
    private _onShootFinishDelegate: Delegate<{}>;
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

        // Resumes locomotion logic after the shoot animation finishes.
        this._onShootFinishDelegate = new Delegate<{}>(() => {
            this._isShooting = false;
            this._lastAnim = null;
            this.character.onAnimFinish.removeListeners(this._onShootFinishDelegate);
        });

        this._onShootLoopDelegate = new Delegate<{}>(() => {
            this.onShoot?.();
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
            this.character.playAnimation(BaseAnimation.WeaponTakeOut, true, 0.1);
            this.character.AnimationSpeed = 1.5;
            this.character.onAnimFinish.addListener(this._onTakeOutFinishDelegate);
        }
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", true);
        this.character.setPartVisible("Weapon_Back", true);
    }

    onUpdate(delta: number) {
        // Keep facing the nearest NPC every frame as it may be moving.
        this.rotation.lookAtTarget = TriggerSystem.getNearestActivePosition("npc");

        // Wait for WeaponTakeOut to complete before entering the combat loop.
        if (!this._isReady) return;

        // One-shot shoot animation is playing — wait for it to finish.
        if (this._isShooting) return;

        const dir = this.getDirection();
        const isStopped = dir.length() < 0.01;

        if (isStopped) {
            // Stationary: loop PistolShoot continuously, firing onShoot on each cycle.
            if (!this._isInLoopMode) {
                this._enterLoopShootMode();
            }
            return;
        }

        // --- Moving ---
        // Exit loop mode and switch to timer-based shot + directional locomotion.
        if (this._isInLoopMode) {
            this._exitLoopShootMode();
        }

        // Advance shoot timer; fire a single shot when the interval elapses.
        this._shootTimer += delta;
        if (this._shootTimer >= this._shootInterval) {
            this._shootTimer = 0;
            this._isShooting = true;
            this._lastAnim = null;
            // Sync damage/hitscan with the start of the shoot animation.
            this.character.playAnimation(BaseAnimation.PistolShoot, true, 0.05);
            this.character.AnimationSpeed = 1.4;
            this.character.onAnimFinish.addListener(this._onShootFinishDelegate);
            this.onShoot?.();
            return;
        }

        // Between shots while moving — play the matching directional pistol locomotion animation.
        const norm = dir.clone().normalize();
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.container.quaternion);
        const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(this.container.quaternion);
        const fwdDot   = norm.dot(forward);
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
        this.character.setPartVisible("Character_Pistol", true);
    }

    onExit() {
        this.character.onAnimFinish.removeListeners(this._onTakeOutFinishDelegate);
        this.character.onAnimFinish.removeListeners(this._onShootFinishDelegate);
        if (this._isInLoopMode) {
            this._exitLoopShootMode();
        }

        // Only holster the weapon when the target has left combat range.
        // If the target is still nearby, keep the weapon drawn so re-entry is instant.
        const targetPos = TriggerSystem.getNearestActivePosition("npc");
        const targetInRange = !!targetPos && this.container.position.distanceTo(targetPos) <= AttackState.ATTACK_RADIUS;

        if (this._isWeaponDrawn && !targetInRange) {
            this.character.playAnimation(BaseAnimation.WeaponPutDown, true);
            this._isWeaponDrawn = false;
            this._isReady = false;
        }

        this.rotation.lookAtTarget = null;
        this.rotation.enabled = true;
        this._lastAnim = null;
                this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", false);
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

    private playIfChanged(anim: BaseAnimation) {
        if (this._lastAnim !== anim) {
            this._lastAnim = anim;
            this.character.playAnimation(anim, false, 0.25);
        }
    }
}