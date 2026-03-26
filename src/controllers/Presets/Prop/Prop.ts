import { Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { TweenC } from "@24tools/playable_template";
import { Easing, Tween } from "@tweenjs/tween.js";
import { PhysicsBody } from "../../PhysicsC";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { TriggerZone } from "../Trigger/TriggerZone";
import { WoodParticleSpawner } from "./WoodParticleSpawner";
import { CameraC } from "../../CameraC";
import { LootProgressBar } from "./LootProgressBar";

export class Prop {
    private _hp: number;
    private readonly _maxHp: number;
    private _broken: boolean = false;

    private readonly _totalSteps: number;
    private readonly _hpPerStep: number;
    private _currentStep: number = 0;
    private _barHostIndex: number = 0;
    private _bar: LootProgressBar | null = null;
    private _siblingsCount: number = 0;

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
        // console.log(_meshes, '_meshes')
        
        this._siblingsCount = _meshes.length;
        this._bar = new LootProgressBar(() => this._meshes[this._barHostIndex] ?? this._meshes[0], this._totalSteps);
    }

    get HpPercent(): number {
        return this._hp / this._maxHp;
    }

    get siblingsCount(): number {
        return this._siblingsCount;
    }

    showBar(): void
    {
        const progress = (this._totalSteps - this._currentStep) / this._totalSteps;
        console.log(`[Prop] showBar → step ${this._currentStep}/${this._totalSteps}, progress ${(progress * 100).toFixed(1)}%`);
        this._bar?.show();
        this._bar?.setProgress(progress);
    }

    hideBar(): void
    {
        this._bar?.hide();
    }

    get DamagePercentage(): number {
        return 100 / this._siblingsCount;
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

        // Update bar: remaining fraction of steps still alive.
        const progress = (this._totalSteps - this._currentStep) / this._totalSteps;
        console.log(`[Prop] takeDamage → step ${this._currentStep}/${this._totalSteps}, hp ${this._hp}/${this._maxHp}, progress ${(progress * 100).toFixed(1)}%`);
        this._bar?.setProgress(progress);

        if (this._currentStep >= this._totalSteps) {
            this.break();
        }
    }

    /** Plays the fly-up / shrink animation on a mesh without removing it from the scene. Returns the tween so callers can chain callbacks. */
    playHitAnimation(obj: Object3D, duration: number = 800) {
        const startScale = obj.scale.x;
        const startY = obj.position.y;
        const rotationVar = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
        const randomRotation = rotationVar[Math.floor(Math.random() * rotationVar.length)] + Math.PI / 4;

        const data = { scale: startScale, y: startY, rotation: randomRotation };
        const tween = new Tween(data)
            .to({ scale: 0, y: startY + 2, rotation: randomRotation + Math.PI }, duration)
            .easing(Easing.Back.In)
            .onUpdate(({ scale, y, rotation }) => {
                obj.scale.setScalar(scale);
                obj.position.y = y + 0.5 * Math.sin((1 - scale) * Math.PI);
                obj.rotation.x = rotation;

                if ((obj as any).material && (obj as any).material.transparent) {
                    (obj as any).material.opacity = scale / startScale;
                }
            }).delay(200); // Stagger hit animations for multiple meshes to avoid uniform scaling and create a more natural effect.

        tween.start();
        

        TweenC.add(tween);
        return tween;
    }

    /** Plays the hit animation and removes the object from the scene once it finishes. */
    private _playDisappearAnimation(obj: Object3D, duration: number = 600): void {
        // this.playHitAnimation(obj, duration).onComplete(() => {
            obj.removeFromParent();
        // });
    }

    /** Removes a single mesh layer and its corresponding shadow (if any). */
    private _removeLayer(index: number) {
        const mesh = this._meshes[index];
        if (!mesh) return;

        // Redirect the bar anchor to the next live mesh before removing this one.
        if (index === this._barHostIndex) {
            const nextMesh = this._meshes[index + 1];
            if (nextMesh) {
                this._barHostIndex = index + 1;
            }
        }

        this._physicsBodies[index]?.removeFromWorld();
        const shadow = this._shadowMeshes[index];
        if (shadow) shadow.removeFromParent();
        this._playDisappearAnimation(mesh);
    }


    private break() {
        this._broken = true;

        for (let i = this._currentStep; i < this._meshes.length; i++) {
            this._shadowMeshes[i]?.removeFromParent();
            this._meshes[i]?.removeFromParent();
        }

        TriggerSystem.removeTrigger(this._trigger);
        this._bar?.hide();
        this._bar?.destroy();
        this._bar = null;
        this.onBroken?.();
    }

    private _playFlashAnimation(target: Object3D, exclude: ReadonlySet<Object3D> = new Set()): void {
        const overlays: Mesh[] = [];

        target.traverse((child: any) => {
            if (!child.isMesh || exclude.has(child)) return;
            const overlay = new Mesh(
                child.geometry,
                new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }),
            );
            overlay.position.copy(child.position);
            overlay.rotation.copy(child.rotation);
            overlay.scale.copy(child.scale);
            child.parent?.add(overlay);
            overlays.push(overlay);
        });
        if (overlays.length === 0) return;

        CameraC.shake(0.1, 0.05);

        const data = { opacity: 0.9 };
        const flashOut = new Tween(data)
            .to({ opacity: 0 }, 500)
            .easing(Easing.Quadratic.Out)
            .onUpdate(({ opacity }) => {
                overlays.forEach(o => { (o.material as MeshBasicMaterial).opacity = opacity; });
            })
            .onComplete(() => {
                overlays.forEach(o => {
                    (o.material as MeshBasicMaterial).dispose();
                    o.removeFromParent();
                });
            });

        flashOut.start();
        TweenC.add(flashOut);
    }

    shake(): void {
        const mesh = this._meshes[this._barHostIndex] ?? this._meshes[0];
        const target = mesh?.parent ?? mesh;
        if (!target || !target.parent) return;

        const shadowSet = new Set<Object3D>(this._shadowMeshes);
        this._playFlashAnimation(target, shadowSet);
        const siblings = target.parent.children;
        this._siblingsCount = siblings.length;
        // this.playHitAnimation(mesh);
        const spawnPos = mesh.getWorldPosition(new Vector3());
        WoodParticleSpawner.spawn(spawnPos);

        // siblings.forEach((child) => {
        //     const ox = child.scale.x;
        //     const oy = child.scale.y;
        //     const oz = child.scale.z;
        //     const oPy = child.position.y;

        //     const scaleData = { sx: ox, sy: oy, sz: oz };
        //     const posData = { py: oPy };

        //     const squish = new Tween(scaleData)
        //         .to({ sx: ox * 1.18, sy: oy * 0.82, sz: oz * 1.18 }, 60) // Виправив час з 600 на 60 згідно з коментарем
        //         .easing(Easing.Quadratic.In)
        //         .onUpdate(({ sx, sy, sz }) => {
        //             child.scale.set(sx, sy, sz);
        //         });

        //     // Spring phase
        //     const springBack = new Tween(scaleData)
        //         .to({ sx: ox, sy: oy, sz: oz }, 80)
        //         .easing(Easing.Elastic.Out)
        //         .onUpdate(({ sx, sy, sz }) => {
        //             child.scale.set(sx, sy, sz);
        //         })
        //         .onComplete(() => {
        //             child.scale.set(ox, oy, oz);
        //         });

        //     // Pop up phase
        //     const popUp = new Tween(posData)
        //         .to({ py: oPy + 0.25 }, 80)
        //         .easing(Easing.Quadratic.Out)
        //         .onUpdate(({ py }) => {
        //             child.position.y = py;
        //         });

        //     const bounceDown = new Tween(posData)
        //         .to({ py: oPy }, 380)
        //         .easing(Easing.Bounce.Out)
        //         .onUpdate(({ py }) => {
        //             child.position.y = py;
        //         })
        //         // .onComplete(() => {
        //         //     child.position.y = oPy;
                    
        //         //     // Ефекти часто краще запускати лише один раз (наприклад, для головного меша)
        //         //     // або для кожного, якщо це дрібні частинки
        //         //     if (child === target) {
        //             //     }
        //             // });
                    

        //     // squish.chain(springBack);
        //     // popUp.chain(bounceDown);

        //     // popUp.start();
        //     // squish.start();

        //     // Додаємо в контролер
        //     // TweenC.add(squish);
        //     // TweenC.add(springBack);
        //     // TweenC.add(popUp);
        //     // TweenC.add(bounceDown);
        // });
    }
}
