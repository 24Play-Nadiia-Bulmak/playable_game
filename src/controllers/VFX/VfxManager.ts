import { QuarksUtil } from "three.quarks";
import { ResourcesC } from "@24tools/playable_template";
import { Object3D, Euler, Vector3 } from "three";
import { ThreeC } from "../ThreeC";
import { ResourcesType } from "../Presets/Enums/ResourcesType";
import { VFXType } from "../Presets/Enums/VFXType";

export class VfxManager {
    /// <summary>
    /// Clones and plays a Quarks particle-system VFX loaded under the given name.
    /// Requires ThreeC.initParticleRenderer() to have been called during scene initialisation.
    ///
    /// @param type     VFXType key (or raw string name) of the loaded quarks VFX resource.
    /// @param parent   Optional parent Object3D. Falls back to the scene root when null.
    /// @param position Optional world-space position offset applied after parenting.
    /// @param rotation Optional Euler rotation applied to the spawned effect.
    /// @param scale    Optional scale applied to the spawned effect.
    /// </summary>
    static Play(
        type: VFXType | string,
        parent: Object3D | null = null,
        position: Vector3 | null = null,
        rotation: Euler | null = null,
        scale: Vector3 | null = null,
    ): Object3D {
        const loaded = (ResourcesC.getResource(ResourcesType.VFX, type.toString()) as { obj: any })?.obj;
        if (!loaded) return new Object3D();

        const effect = loaded.clone(true) as Object3D;
        QuarksUtil.setAutoDestroy(effect, true);
        QuarksUtil.addToBatchRenderer(effect, ThreeC.particleRenderer as any);

        if (parent) parent.add(effect);
        else ThreeC.addToScene(effect);

        if (position) effect.position.copy(position);
        if (rotation) effect.rotation.copy(rotation);
        if (scale) effect.scale.copy(scale);

        return effect;
    }

    static Remove(vfx: Object3D): void {
        vfx.removeFromParent();
    }
}
