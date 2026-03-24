import { Object3D, Vector3 } from "three";
import { TweenC } from "@24tools/playable_template";
import { Easing, Tween } from "@tweenjs/tween.js";
import { PhysicsBody } from "../../PhysicsC";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { TriggerZone } from "../Trigger/TriggerZone";
import { DamageProgressBar } from "./DamageProgressBar";
import { WoodParticleSpawner } from "./WoodParticleSpawner";

export class Prop {
    private _hp: number;
    private readonly _maxHp: number;
    private _broken: boolean = false;
    private readonly _bar: DamageProgressBar;

    /** Total mesh layers — drives progress bar granularity. */
    private readonly _totalSteps: number;
    /** HP threshold at which the next layer is stripped. */
    private readonly _hpPerStep: number;
    /** How many layers have already been removed. */
    private _currentStep: number = 0;
    /** Index of the mesh the bar is currently parented to. */
    private _barHostIndex: number = 0;

    /** Called once when this prop's HP reaches zero. Assign from outside to hook respawn logic. */
    onBroken: (() => void) | null = null;

    constructor(
        private readonly _meshes: Object3D[],
        private readonly _physicsBodies: PhysicsBody[],
        private readonly _trigger: TriggerZone,
        private readonly _shadowMeshes: Object3D[] = [],
        hp: number = 3,
    ) {
        this._totalSteps = Math.max(1, _meshes.length);
        this._maxHp = hp * this._totalSteps;
        this._hp = this._maxHp;
        this._hpPerStep = this._maxHp / this._totalSteps;

        this._bar = new DamageProgressBar();
        this._meshes[0]?.add(this._bar);
    }

    get HpPercent(): number {
        return this._hp / this._maxHp;
    }

    showBar() {
        this._bar.show();
    }

    hideBar() {
        this._bar.hide();
    }

    takeDamage(amount: number = 1) {
        if (this._broken) return;
        this._hp -= amount;

        // Check whether we've crossed the threshold for the next layer removal.
        const stepsShouldBeRemoved = Math.min(
            this._totalSteps,
            Math.floor((this._maxHp - this._hp) / this._hpPerStep),
        );

        while (this._currentStep < stepsShouldBeRemoved) {
            this._removeLayer(this._currentStep);
            this._currentStep++;
        }

        // Progress bar reflects current HP so it fills down smoothly on each hit.
        this._bar.update(this._hp / this._maxHp);

        if (this._currentStep >= this._totalSteps) {
            this.break();
        }
    }

    /** Removes a single mesh layer and its corresponding shadow (if any). */
    private _removeLayer(index: number) {
        const mesh = this._meshes[index];
        if (!mesh) return;

        // Re-parent the bar to the next live mesh before removing this one,
        // so it stays visible in the scene.
        if (index === this._barHostIndex) {
            const nextMesh = this._meshes[index + 1];
            if (nextMesh) {
                nextMesh.add(this._bar);
                this._barHostIndex = index + 1;
            }
        }

        const spawnPos = mesh.getWorldPosition(new Vector3());
        WoodParticleSpawner.spawn(spawnPos);

        this._physicsBodies[index]?.destroy();
        mesh.removeFromParent();
        this._shadowMeshes[index]?.removeFromParent();
    }

    private break() {
        this._broken = true;
        this._bar.hide();

        // Remove any remaining layers that weren't caught by step-based removal.
        for (let i = this._currentStep; i < this._meshes.length; i++) {
            this._meshes[i]?.removeFromParent();
            this._shadowMeshes[i]?.removeFromParent();
        }

        TriggerSystem.removeTrigger(this._trigger);
        this.onBroken?.();
    }

    /**
     * Plays a hit-reaction on the box container: a squish-stretch punch (compress Y,
     * expand XZ) followed by an elastic spring back, combined with a Y-axis pop-and-bounce.
     * Targets the parent container so all mesh components react together.
     */
    shake(): void {
        const mesh = this._meshes[this._barHostIndex] ?? this._meshes[0];
        const target = mesh?.parent ?? mesh;
        if (!target) return;

        const ox = target.scale.x;
        const oy = target.scale.y;
        const oz = target.scale.z;
        const oPy = target.position.y;

        const scaleData = { sx: ox, sy: oy, sz: oz };
        const posData = { py: oPy };

        // Squish phase — compress Y / expand XZ in 60 ms for immediate tactile feedback.
        const squish = new Tween(scaleData)
            .to({ sx: ox * 1.18, sy: oy * 0.82, sz: oz * 1.18 }, 60)
            .easing(Easing.Quadratic.Out)
            .onUpdate(({ sx, sy, sz }) => {
                target.scale.set(sx, sy, sz);
            });

        // Spring phase — elastic return to original scale in 500 ms.
        const springBack = new Tween(scaleData)
            .to({ sx: ox, sy: oy, sz: oz }, 500)
            .easing(Easing.Elastic.Out)
            .onUpdate(({ sx, sy, sz }) => {
                target.scale.set(sx, sy, sz);
            })
            .onComplete(() => {
                target.scale.set(ox, oy, oz);
            });

        // Pop up phase — box hops 0.25 units upward in 80 ms (physical hit reaction).
        const popUp = new Tween(posData)
            .to({ py: oPy + 0.25 }, 80)
            .easing(Easing.Quadratic.Out)
            .onUpdate(({ py }) => {
                target.position.y = py;
            });

        // Bounce down phase — lands with Bounce.Out easing back to the original Y.
        const bounceDown = new Tween(posData)
            .to({ py: oPy }, 380)
            .easing(Easing.Bounce.Out)
            .onUpdate(({ py }) => {
                target.position.y = py;
            })
            .onComplete(() => {
                target.position.y = oPy;
            });

        squish.chain(springBack);
        popUp.chain(bounceDown);

        squish.start();
        popUp.start();
        TweenC.add(squish);
        TweenC.add(springBack);
        TweenC.add(popUp);
        TweenC.add(bounceDown);
    }
}
