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

        const stepsShouldBeRemoved = Math.min(
            this._totalSteps,
            Math.floor((this._maxHp - this._hp) / this._hpPerStep),
        );

        while (this._currentStep < stepsShouldBeRemoved) {
            this._removeLayer(this._currentStep);
            this._currentStep++;
        }

        const progress = (this._totalSteps - this._currentStep) / this._totalSteps;
        this._bar?.setProgress(progress);

        if (this._currentStep >= this._totalSteps) {
            this.break();
        }
    }

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
            }).delay(200);
        tween.start();
        

        TweenC.add(tween);
        return tween;
    }

    private _playDisappearAnimation(obj: Object3D, duration: number = 600): void {
            obj.removeFromParent();
    }

    private _removeLayer(index: number) {
        const mesh = this._meshes[index];
        if (!mesh) return;

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

        
        const data = { opacity: 0.9 };
        const flashOut = new Tween(data)
            .to({ opacity: 0 }, 500)
            .easing(Easing.Quadratic.Out)
            .onStart(() => {
                CameraC.shake(0.1, 0.05);
            })
            .onUpdate(({ opacity }) => {
                overlays.forEach(o => { (o.material as MeshBasicMaterial).opacity = opacity; });
            })
            .onComplete(() => {
                CameraC.shake(0.1, 0.05);

                const data2 = { opacity: 0.7 };
                const flashOut2 = new Tween(data2)
                    .to({ opacity: 0 }, 200)
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

                overlays.forEach(o => { (o.material as MeshBasicMaterial).opacity = 0.7; });
                flashOut2.start();
                TweenC.add(flashOut2);
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
        const spawnPos = mesh.getWorldPosition(new Vector3());
        WoodParticleSpawner.spawn(spawnPos);
    }
}
