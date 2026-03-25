import { Object3D, Vector3 } from "three";
import { QuarksLoader, QuarksUtil } from "three.quarks";
import { ThreeC } from "../../ThreeC";

import vfxHitJson from "../../../resources/vfx/VFX_Lootable_Hit.json";
import vfxDestroyJson from "../../../resources/vfx/VFX_Lootable_Destroy.json";

export class VfxSpawner {
    private static _hitVfx: Object3D | null = null;
    private static _destroyVfx: Object3D | null = null;

    /// <summary>
    /// Parses both VFX JSONs, registers all particle emitters with the
    /// BatchedParticleRenderer and adds the root objects to the scene.
    /// Must be called once after ThreeC.initParticleRenderer().
    /// </summary>
    static init(): void {
        const loader = new QuarksLoader();

        const hitVfx = loader.parse(vfxHitJson as any) as Object3D;
        QuarksUtil.addToBatchRenderer(hitVfx, ThreeC.particleRenderer);
        ThreeC.addToScene(hitVfx);
        this._hitVfx = hitVfx;

        const destroyVfx = loader.parse(vfxDestroyJson as any) as Object3D;
        QuarksUtil.addToBatchRenderer(destroyVfx, ThreeC.particleRenderer);
        ThreeC.addToScene(destroyVfx);
        this._destroyVfx = destroyVfx;
    }

    /**
     * Moves the hit VFX to `worldPos` and replays it from the beginning.
     * Safe to call before init() — will silently no-op.
     *
     * @param worldPos World-space position where the impact effect should appear.
     */
    static spawnHit(worldPos: Vector3): void {
        if (!this._hitVfx) return;

        this._hitVfx.position.copy(worldPos);
        QuarksUtil.restart(this._hitVfx);
    }

    /**
     * Moves the destroy VFX to `worldPos` and replays it from the beginning.
     * Intended to be called when a prop is fully destroyed.
     * Safe to call before init() — will silently no-op.
     *
     * @param worldPos World-space position where the destroy effect should appear.
     */
    static spawnDestroy(worldPos: Vector3): void {
        if (!this._destroyVfx) return;

        this._destroyVfx.position.copy(worldPos);
        QuarksUtil.restart(this._destroyVfx);
    }
}
