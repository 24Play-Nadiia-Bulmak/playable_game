import { Box3, CanvasTexture, Color, DoubleSide, FrontSide, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Raycaster, Vector2, Vector3 } from "three";
import { Delegate, ResourcesC, TweenC, UpdateController } from "@24tools/playable_template";
import { Easing, Tween } from "@tweenjs/tween.js";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { ThreeC } from "../../ThreeC";
import { TriggerZone } from "../Trigger/TriggerZone";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { Player } from "../Player";
import { CameraC } from "../../CameraC";
import { ResourcesType } from "../Enums/ResourcesType";
import { MeshType } from "../Enums/MeshType";
import { HudC } from "../UI/HudC";
import { PAY_ZONE } from "../Constants/payZone";
import { COLORS } from "../Constants/colors";

export class PayZone
{
    private readonly _mesh:     Object3D;
    private readonly _trigger:  TriggerZone;
    private readonly _position: Vector3;
    private          _bobTweens:    Tween<any>[] = [];
    private          _isCollecting: boolean = false;

    private          _fillMesh:        Mesh;
    private          _fillSize:        number = 0;
    private          _activeFillTweens: Tween<any>[] = [];
    private readonly _labelMesh:      Mesh;
    private readonly _updateDelegate: Delegate<number>;

    onPaid?: () => void;
    constructor(radius: number = 0)
    {
        const mapMesh  = ThreeC.getObject("map");
        this._mesh     = mapMesh.getObjectByName(PAY_ZONE.MESH_NAME)!;
        this._position = this._mesh.getWorldPosition(new Vector3());

        this._startIdleAnimation();

        const bbox     = new Box3().setFromObject(this._mesh);
        const meshSize = new Vector3();
        bbox.getSize(meshSize);
        const fillSize = Math.min(meshSize.x, meshSize.z);
        this._fillSize = fillSize;

        this._fillMesh = PayZone._createFillSquare(fillSize);
        this._fillMesh.position.set(0, PAY_ZONE.FILL_MESH_Y_OFFSET, fillSize / 2);
        this._mesh.add(this._fillMesh);

        this._trigger = new TriggerZone(this._position, radius, PAY_ZONE.TRIGGER_NAME, false);
        this._trigger.onStay = () => this._onPlayerEnter();
        TriggerSystem.addTrigger(this._trigger);

        this._labelMesh = PayZone._createBuildLabel();
        this._labelMesh.rotation.x = -Math.PI / 2;
        this._labelMesh.position.copy(this._position);
        this._labelMesh.position.y += PAY_ZONE.LABEL_Y_OFFSET;
        this._labelMesh.renderOrder = 1;
        ThreeC.addToScene(this._labelMesh);

        this._updateDelegate = UpdateController.Instance.onUpdate.addDelegate(() => this._tickLabel());
    }

    private _tickLabel(): void
    {
        const worldPos = this._mesh.getWorldPosition(new Vector3());
        this._labelMesh.position.set(worldPos.x, worldPos.y + PAY_ZONE.LABEL_Y_OFFSET, worldPos.z);
    }

    private static _createFillSquare(size: number): Mesh
    {
        const geometry  = new PlaneGeometry(size, size);
        const material  = new MeshBasicMaterial({
            color:       new Color(COLORS.PAY_ZONE_FILL),
            transparent: true,
            opacity:     PAY_ZONE.FILL_OPACITY,
            depthWrite:  false,
            side:        DoubleSide,
        });
        const mesh      = new Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.scale.set(1, 0, 1);
        return mesh;
    }

    private _tweenFillAcrossLevel(timeToFull: number, remainderDuration: number, finalTarget: number): void
    {
        this._stopActiveFillTweens();

        const data1  = { y: this._fillMesh.scale.y };
        const tween1 = new Tween(data1)
            .to({ y: 1.0 }, timeToFull)
            .easing(Easing.Quadratic.Out)
            .onUpdate(({ y }) =>
            {
                this._fillMesh.scale.y    = y;
                this._fillMesh.position.z = this._fillSize / 2 * (1 - y);
            })
            .onComplete(() =>
            {
                if (finalTarget <= 0)
                {
                    // Smooth reset to 0 with no remainder
                    const dataReset  = { y: this._fillMesh.scale.y };
                    const tweenReset = new Tween(dataReset)
                        .to({ y: 0 }, PAY_ZONE.FILL_RESET_MS)
                        .easing(Easing.Quadratic.In)
                        .onUpdate(({ y }) =>
                        {
                            this._fillMesh.scale.y    = y;
                            this._fillMesh.position.z = this._fillSize / 2 * (1 - y);
                        })
                        .onComplete(() =>
                        {
                            this._fillMesh.position.z = this._fillSize / 2;
                        });
                    this._activeFillTweens.push(tweenReset);
                    tweenReset.start();
                    TweenC.add(tweenReset);
                    return;
                }

                // Smooth reset to 0, then animate to remainder
                const dataReset  = { y: this._fillMesh.scale.y };
                const tweenReset = new Tween(dataReset)
                    .to({ y: 0 }, PAY_ZONE.FILL_RESET_MS)
                    .easing(Easing.Quadratic.In)
                    .onUpdate(({ y }) =>
                    {
                        this._fillMesh.scale.y    = y;
                        this._fillMesh.position.z = this._fillSize / 2 * (1 - y);
                    })
                    .onComplete(() =>
                    {
                        this._fillMesh.position.z = this._fillSize / 2;
                        const data2  = { y: 0 };
                        const tween2 = new Tween(data2)
                            .to({ y: finalTarget }, remainderDuration)
                            .easing(Easing.Quadratic.Out)
                            .onUpdate(({ y }) =>
                            {
                                this._fillMesh.scale.y    = y;
                                this._fillMesh.position.z = this._fillSize / 2 * (1 - y);
                            });
                        this._activeFillTweens.push(tween2);
                        tween2.start();
                        TweenC.add(tween2);
                    });
                this._activeFillTweens.push(tweenReset);
                tweenReset.start();
                TweenC.add(tweenReset);
            });
        this._activeFillTweens.push(tween1);
        tween1.start();
        TweenC.add(tween1);
    }

    private _stopActiveFillTweens(): void
    {
        for (const t of this._activeFillTweens) t.stop();
        this._activeFillTweens = [];
    }

    private _tweenFill(target: number, durationMs: number = 200): void
    {
        this._stopActiveFillTweens();

        const clampedTarget = Math.min(Math.max(target, 0), 1);
        const data          = { y: this._fillMesh.scale.y };
        const tween         = new Tween(data)
            .to({ y: clampedTarget }, durationMs)
            .easing(Easing.Quadratic.Out)
            .onUpdate(({ y }) =>
            {
                this._fillMesh.scale.y    = y;
                this._fillMesh.position.z = this._fillSize / 2 * (1 - y);
            });
        this._activeFillTweens.push(tween);
        tween.start();
        TweenC.add(tween);
    }

    private static _createBuildLabel(): Mesh
    {
        const canvas   = document.createElement('canvas');
        canvas.width   = 512;
        canvas.height  = 128;
        const ctx      = canvas.getContext('2d')!;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font         = PAY_ZONE.LABEL_FONT;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle  = PAY_ZONE.LABEL_STROKE_COLOR;
        ctx.lineWidth    = 7;
        ctx.strokeText(PAY_ZONE.LABEL_TEXT, canvas.width * 0.5, canvas.height * 0.5);
        ctx.fillStyle    = PAY_ZONE.LABEL_FILL_COLOR;
        ctx.fillText(PAY_ZONE.LABEL_TEXT, canvas.width * 0.5, canvas.height * 0.5);

        const texture  = new CanvasTexture(canvas);
        const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: FrontSide });
        const geometry = new PlaneGeometry(1.5, 0.375);
        return new Mesh(geometry, material);
    }

    private _onPlayerEnter(): void
    {
        if (this._isCollecting) return;
        if (!Player.IsIdle) return;

        const inv       = Player.inventory.Inventory;
        const woodCount = Math.min(inv[PAY_ZONE.RESOURCE_WOOD] ?? 0, PAY_ZONE.MAX_PLANKS);
        if (woodCount <= 0) return;

        this._isCollecting = true;
        Player.inventory.minusResource(PAY_ZONE.RESOURCE_WOOD, woodCount);

        const visualCount = Math.min(woodCount, PAY_ZONE.MAX_PLANKS);
        const playerPos   = Player.Position.clone().add(new Vector3(0, 1, 0));
        const alreadyDelivered = HudC.getDeliveredInLevel();

        const phase1Duration = (visualCount - 1) * PAY_ZONE.STAGGER_MS + PAY_ZONE.PHASE1_BASE_MS + PAY_ZONE.PHASE_BUFFER_MS;
        const phase2Duration = (visualCount - 1) * PAY_ZONE.STAGGER_MS + PAY_ZONE.PHASE2_BASE_MS + PAY_ZONE.PHASE_BUFFER_MS;
        const totalDuration  = phase1Duration + phase2Duration;

        if (alreadyDelivered + visualCount > PAY_ZONE.MAX_PLANKS)
        {
            // Delivery crosses a level boundary — split the fill tween:
            // animate to full (1.0), reset to 0, then animate to the overflow remainder.
            const planksToFill  = PAY_ZONE.MAX_PLANKS - alreadyDelivered;
            const timeToLevelUp = phase1Duration + (planksToFill - 1) * PAY_ZONE.STAGGER_MS + PAY_ZONE.PHASE2_BASE_MS;
            const finalTarget   = (alreadyDelivered + visualCount - PAY_ZONE.MAX_PLANKS) / PAY_ZONE.MAX_PLANKS;
            this._tweenFillAcrossLevel(timeToLevelUp, totalDuration - timeToLevelUp, finalTarget);
        }
        else
        {
            const fillTarget = (alreadyDelivered + visualCount) / PAY_ZONE.MAX_PLANKS;
            this._tweenFill(fillTarget, totalDuration);
        }

        this._spawnPlanks3D(playerPos, this._position, visualCount, PAY_ZONE.PHASE1_BASE_MS, () =>
        {
            const barTarget = this._getDeliveryBarWorldPosition();
            HudC.pulseTrack();
            this._spawnPlanks3D(this._position, barTarget, visualCount, PAY_ZONE.PHASE2_BASE_MS, () =>
            {
                this._onDeliveryComplete();
            }, true, () =>
            {
                HudC.addDelivered(1);
            });
        });
    }

    private _spawnPlanks3D(
        from:       Vector3,
        to:         Vector3,
        count:      number,
        duration:   number,
        onComplete: () => void,
        fadeOut:    boolean = false,
        onEach?:    () => void,
    ): void
    {
        if (count <= 0) { onComplete(); return; }

        const gltf = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.WoodParticle);
        if (!gltf) { onComplete(); return; }

        let finished = 0;

        for (let i = 0; i < count; i++)
        {
            setTimeout(() =>
            {
                const plank = gltf.scene.clone(true);
                const spread = PAY_ZONE.PLANK_SPAWN_SPREAD;
                plank.position.set(
                    from.x + (Math.random() - 0.5) * spread,
                    from.y + Math.random() * PAY_ZONE.PLANK_HEIGHT_SPREAD,
                    from.z + (Math.random() - 0.5) * spread,
                );
                plank.scale.setScalar(PAY_ZONE.PLANK_SCALE_BASE + Math.random() * PAY_ZONE.PLANK_SCALE_SPREAD);
                const initialScale = plank.scale.x;

                if (fadeOut)
                {
                    plank.traverse(child =>
                    {
                        const mesh = child as any;
                        if (mesh.isMesh && mesh.material)
                        {
                            mesh.material = mesh.material.clone();
                        }
                    });
                }

                ThreeC.addToScene(plank);

                const arcHeight = PAY_ZONE.ARC_HEIGHT_BASE + Math.random() * PAY_ZONE.ARC_HEIGHT_SPREAD;
                const data = {
                    x:  plank.position.x,
                    y:  plank.position.y,
                    z:  plank.position.z,
                    ry: plank.rotation.y,
                    t:  0,
                };

                const tween = new Tween(data)
                    .to({ x: to.x, y: to.y, z: to.z, ry: data.ry + Math.PI * 4, t: 1 }, duration + Math.random() * 100)
                    .easing(Easing.Quadratic.InOut)
                    .onUpdate(({ x, y, z, ry, t }) =>
                    {
                        plank.position.set(x, y + arcHeight * Math.sin(t * Math.PI), z);
                        plank.rotation.y = ry;

                        if (fadeOut && t > PAY_ZONE.FADE_START_THRESHOLD)
                        {
                            const progress = (t - PAY_ZONE.FADE_START_THRESHOLD) * 2;
                            plank.scale.setScalar(initialScale * (1 - progress * PAY_ZONE.FADE_INTENSITY));
                        }
                    })
                    .onComplete(() =>
                    {
                        plank.removeFromParent();
                        onEach?.();
                        if (++finished >= count) onComplete();
                    });

                tween.start();
                TweenC.add(tween);
            }, i * PAY_ZONE.STAGGER_MS);
        }
    }

    private _getDeliveryBarWorldPosition(): Vector3
    {
        const camera = CameraC.camera;
        if (!camera)
        {
            return this._position.clone().add(new Vector3(0, 5, 0));
        }

        const barRect = HudC.getDeliveryBarRect();
        const screenX = barRect ? barRect.left + barRect.width  * 0.5 : window.innerWidth  * 0.5;
        const screenY = barRect ? barRect.top  + barRect.height * 0.5 : window.innerHeight - PAY_ZONE.FALLBACK_Y_OFFSET;

        const ndcX =  (screenX / window.innerWidth)  * 2 - 1;
        const ndcY = -(screenY / window.innerHeight) * 2 + 1;

        camera.updateWorldMatrix(true, false);
        const raycaster = new Raycaster();
        raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera);
        return raycaster.ray.at(PAY_ZONE.RAYCASTER_DEPTH, new Vector3());
    }

    private _onDeliveryComplete(): void
    {
        if (HudC.isLevelComplete())
        {
            // Keep _isCollecting=true until the reset animation finishes
            // so a consecutive delivery cannot start before the fill returns to 0.
            this._resetFill(() => { this._isCollecting = false; });
            this.onPaid?.();
        }
        else
        {
            this._isCollecting = false;
        }
    }

    private _resetFill(onComplete?: () => void): void
    {
        this._stopActiveFillTweens();
        const data  = { y: this._fillMesh.scale.y };
        const tween = new Tween(data)
            .to({ y: 0 }, PAY_ZONE.FILL_RESET_MS)
            .easing(Easing.Quadratic.In)
            .onUpdate(({ y }) =>
            {
                this._fillMesh.scale.y    = y;
                this._fillMesh.position.z = this._fillSize / 2 * (1 - y);
            })
            .onComplete(() =>
            {
                this._fillMesh.scale.y    = 0;
                this._fillMesh.position.z = this._fillSize / 2;
                onComplete?.();
            });
        this._activeFillTweens.push(tween);
        tween.start();
        TweenC.add(tween);
    }

    private _startIdleAnimation(): void
    {
        const mesh  = this._mesh;
        const baseY = this._position.y;
        const data  = { y: baseY };

        const bobUp = new Tween(data)
            .to({ y: baseY + PAY_ZONE.BOB_HEIGHT }, PAY_ZONE.BOB_DURATION_MS)
            .easing(Easing.Sinusoidal.InOut)
            .onUpdate(({ y }) => { mesh.position.y = y; });

        const bobDown = new Tween(data)
            .to({ y: baseY }, PAY_ZONE.BOB_DURATION_MS)
            .easing(Easing.Sinusoidal.InOut)
            .onUpdate(({ y }) => { mesh.position.y = y; });

        bobUp.chain(bobDown);
        bobDown.chain(bobUp);
        bobUp.start();

        TweenC.add(bobUp);
        TweenC.add(bobDown);
        this._bobTweens.push(bobUp, bobDown);
    }
}

