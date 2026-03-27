import { Box3, CanvasTexture, Color, DoubleSide, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Raycaster, Vector2, Vector3 } from "three";
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

const STAGGER_MS        = 80;
export const MAX_PLANKS = 7;

export class PayZone
{
    private readonly _mesh:     Object3D;
    private readonly _trigger:  TriggerZone;
    private readonly _position: Vector3;
    private          _bobTweens: Tween<any>[] = [];
    private          _isCollecting: boolean = false;

    private          _fillMesh:        Mesh;
    private          _fillSize:        number = 0;
    private readonly _labelMesh:      Mesh;
    private readonly _updateDelegate: Delegate<number>;

    onPaid?: () => void;

    /**
     * Creates a pay zone at `position` using the "zone" GLB mesh and registers an
     * interaction trigger sphere. When the player enters while carrying resources,
     * the following sequential animations fire:
     *   1. 3-D coin meshes fly from the player world position to the zone  (task 64).
     *   2. 3-D coin meshes burst out of the zone and fly toward the HUD    (task 63).
     *   3. The zone mesh scales up then shrinks to nothing                  (task 65).
     * Resources are deducted from the player's inventory at the start of the sequence.
     *
     * @param position  World-space centre of the zone and its trigger sphere.
     * @param radius    Trigger interaction radius in world units.
     */
    constructor(position: Vector3, radius: number = 0)
    {
        this._position = position.clone();

        // Clone so each PayZone owns an independent Object3D — getObject returns
        // the shared gltf.scene root, which a previous zone may have scaled to 0.
        this._mesh = ThreeC.getObject("zone").clone(true);
        this._mesh.scale.setScalar(1);
        this._mesh.position.copy(position);
        ThreeC.addToScene(this._mesh);

        this._startIdleAnimation();

        const bbox     = new Box3().setFromObject(this._mesh);
        const meshSize = new Vector3();
        bbox.getSize(meshSize);
        const fillSize = Math.min(meshSize.x, meshSize.z);
        this._fillSize = fillSize;

        this._fillMesh = PayZone._createFillSquare(fillSize);
        // Anchor fill at the front edge (+Z side) so it grows toward the back (bottom-to-top)
        this._fillMesh.position.set(0, 0.02, fillSize / 2);
        this._mesh.add(this._fillMesh);

        this._trigger = new TriggerZone(position, radius, "payzone", false);
        this._trigger.onStay = () => this._onPlayerEnter();
        TriggerSystem.addTrigger(this._trigger);

        this._labelMesh = PayZone._createBuildLabel();
        // Lie flat on the ground plane, centred on the zone
        this._labelMesh.rotation.x = -Math.PI / 2;
        this._labelMesh.position.set(0, 0.05, 0);
        this._mesh.add(this._labelMesh);

        this._updateDelegate = UpdateController.Instance.onUpdate.addDelegate(() => this._tickLabel());
    }

    /** No per-frame update needed for a flat label — kept for future use. */
    private _tickLabel(): void {}

    /** Creates a semi-transparent green square that fills along the Z axis as planks are delivered. */
    private static _createFillSquare(size: number): Mesh
    {
        const geometry  = new PlaneGeometry(size, size);
        const material  = new MeshBasicMaterial({
            color:       new Color('#8CBA44'),
            transparent: true,
            opacity:     0.7,
            depthWrite:  false,
            side:        DoubleSide,
        });
        const mesh      = new Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        // Start at full width but zero depth — scale.y animates 0→1 (world Z direction)
        mesh.scale.set(1, 0, 1);
        return mesh;
    }

    /** Smoothly tweens fill scale.y to `target` (0–1) over `durationMs`.
     *  Simultaneously tracks position.z so the back edge stays fixed and fill grows forward.
     */
    private _tweenFill(target: number, durationMs: number = 200): void
    {
        const clampedTarget = Math.min(Math.max(target, 0), 1);
        const data          = { y: this._fillMesh.scale.y };
        const tween         = new Tween(data)
            .to({ y: clampedTarget }, durationMs)
            .easing(Easing.Quadratic.Out)
            .onUpdate(({ y }) =>
            {
                this._fillMesh.scale.y    = y;
                // Keep front edge (+Z) anchored: center shifts toward back as fill grows
                this._fillMesh.position.z = this._fillSize / 2 * (1 - y);
            });
        tween.start();
        TweenC.add(tween);
    }

    /** Creates a flat ground-plane with the word BUILD rendered onto a canvas texture.
     *  The geometry is sized to fill ~50% of the zone disc diameter.
     */
    private static _createBuildLabel(): Mesh
    {
        const canvas   = document.createElement('canvas');
        canvas.width   = 512;
        canvas.height  = 128;
        const ctx      = canvas.getContext('2d')!;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font         = 'bold 88px gameFont, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle  = '#000000';
        ctx.lineWidth    = 7;
        ctx.strokeText('BUILD', canvas.width * 0.5, canvas.height * 0.5);
        ctx.fillStyle    = '#ffffff';
        ctx.fillText('BUILD', canvas.width * 0.5, canvas.height * 0.5);

        const texture  = new CanvasTexture(canvas);
        const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: DoubleSide });
        // 4:1 aspect ratio canvas → PlaneGeometry width keeps that ratio; width = 50% of zone size
        const geometry = new PlaneGeometry(1.5, 0.375);
        return new Mesh(geometry, material);
    }

    private _onPlayerEnter(): void
    {
        if (this._isCollecting) return;
        if (!Player.IsIdle) return;

        const inv       = Player.inventory.Inventory;
        const woodCount = Math.min(inv["wood"] ?? 0, MAX_PLANKS);
        if (woodCount <= 0) return;

        this._isCollecting = true;
        // this._labelMesh.visible = false;
        Player.inventory.minusResource("wood", woodCount);

        const visualCount = Math.min(woodCount, MAX_PLANKS);
        const playerPos   = Player.Position.clone().add(new Vector3(0, 1, 0)); // Aim for player's head, not feet

        // Fill target corresponds to the fraction of this level that will be complete after delivery
        const alreadyDelivered = HudC.getDeliveredInLevel();
        const fillTarget       = Math.min((alreadyDelivered + visualCount) / MAX_PLANKS, 1);

        // Start fill immediately covering both flight phases duration
        const phase1Duration = (visualCount - 1) * STAGGER_MS + 600 + 50;
        const phase2Duration = (visualCount - 1) * STAGGER_MS + 500 + 50;
        this._tweenFill(fillTarget, phase1Duration + phase2Duration);

        // Wood planks fly from player → zone
        this._spawnPlanks3D(playerPos, this._position, visualCount, 600, () =>
        {
            // Wood planks fly from zone → delivery progress bar (fade out on the way)
            const barTarget = this._getDeliveryBarWorldPosition();
            HudC.pulseTrack();
            this._spawnPlanks3D(this._position, barTarget, visualCount, 500, () =>
            {
                this._animateDisappear();
            }, true, () =>
            {
                HudC.addDelivered(1);
            });
        });
    }

    /**
     * Spawns `count` wood-plank mesh clones that arc from `from` to `to` in world space.
     * Each plank is staggered by STAGGER_MS and follows a parabolic arc (Y bounce).
     * When `fadeOut` is true, planks fade to transparent starting at the midpoint of the arc.
     * Calls `onEach` every time a single plank finishes, and `onComplete` after the last one.
     */
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

                // Slight random spread at spawn point so planks don't stack
                const spread = 0.25;
                plank.position.set(
                    from.x + (Math.random() - 0.5) * spread,
                    from.y + Math.random() * 0.2,
                    from.z + (Math.random() - 0.5) * spread,
                );
                plank.scale.setScalar(0.4 + Math.random() * 0.2);
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

                const arcHeight = 1.2 + Math.random() * 0.8;
                const data = {
                    x:  plank.position.x,
                    y:  plank.position.y,
                    z:  plank.position.z,
                    ry: plank.rotation.y,
                    t:  0, // normalised progress 0→1 used for the parabola
                };

                const tween = new Tween(data)
                    .to({ x: to.x, y: to.y, z: to.z, ry: data.ry + Math.PI * 4, t: 1 }, duration + Math.random() * 100)
                    .easing(Easing.Quadratic.InOut)
                    .onUpdate(({ x, y, z, ry, t }) =>
                    {
                        plank.position.set(x, y + arcHeight * Math.sin(t * Math.PI), z);
                        plank.rotation.y = ry;

                        if (fadeOut && t > 0.5)
                        {
                            const progress = (t - 0.5) * 2; // 0→1 over the second half
                            plank.scale.setScalar(initialScale * (1 - progress * 0.85));
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
            }, i * STAGGER_MS);
        }
    }

    /**
     * Finds the world-space point that corresponds to the centre of the delivery
     * progress bar on screen, giving planks a natural target to fly toward.
     * Casts a ray from the camera through the bar's NDC position and returns a
     * point 6 units along that ray, so planks always appear to reach the UI element
     * regardless of camera distance or frustum depth.
     */
    private _getDeliveryBarWorldPosition(): Vector3
    {
        const camera = CameraC.camera;
        if (!camera)
        {
            return this._position.clone().add(new Vector3(0, 5, 0));
        }

        const barRect = HudC.getDeliveryBarRect();
        const screenX = barRect ? barRect.left + barRect.width  * 0.5 : window.innerWidth  * 0.5;
        const screenY = barRect ? barRect.top  + barRect.height * 0.5 : window.innerHeight - 30;

        const ndcX =  (screenX / window.innerWidth)  * 2 - 1;
        const ndcY = -(screenY / window.innerHeight) * 2 + 1;

        // Raycaster properly handles camera matrix updates and both perspective/orthographic cameras.
        camera.updateWorldMatrix(true, false);
        const raycaster = new Raycaster();
        raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera);
        return raycaster.ray.at(6, new Vector3());
    }

    /** Scales the zone mesh upward and away, then removes it from the scene (task 65). */
    private _animateDisappear(): void
    {
        this._bobTweens.forEach(t => t.stop());
        this._bobTweens = [];

        // Level not yet complete — reset the zone in place for another delivery
        if (!HudC.isLevelComplete())
        {
            this._reinitialize();
            return;
        }

        // Level complete — remove trigger and play disappear; onPaid signals the owner to spawn a new zone
        TriggerSystem.removeTrigger(this._trigger);

        const mesh   = this._mesh;
        const startY = this._position.y;
        const data   = { scale: 1, y: startY };

        const tween = new Tween(data)
            .to({ scale: 0, y: startY + 2.5 }, 700)
            .easing(Easing.Back.In)
            .onUpdate(({ scale, y }) =>
            {
                mesh.scale.setScalar(scale);
                mesh.position.y = y;
            })
            .onComplete(() =>
            {
                // _labelMesh and _fillMesh are children of mesh — removed automatically
                mesh.removeFromParent();
                UpdateController.Instance.onUpdate.removeListeners(this._updateDelegate);
                this.onPaid?.();
            });

        tween.start();
        TweenC.add(tween);
    }

    /** Resets the zone for another collection cycle when the level is not yet complete. */
    private _reinitialize(): void
    {
        this._isCollecting = false;
        this._labelMesh.visible = true;
        this._startIdleAnimation();
    }

    /** Gentle continuous bob so the zone draws the player's attention in the scene. */
    private _startIdleAnimation(): void
    {
        const mesh  = this._mesh;
        const baseY = this._position.y;
        const data  = { y: baseY };

        const bobUp = new Tween(data)
            .to({ y: baseY + 0.35 }, 900)
            .easing(Easing.Sinusoidal.InOut)
            .onUpdate(({ y }) => { mesh.position.y = y; });

        const bobDown = new Tween(data)
            .to({ y: baseY }, 900)
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

