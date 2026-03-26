import { FXC, ResourcesC } from "@24tools/playable_template";
import { Texture, Vector3 } from "three";

type FxResource = { texture: Texture; info: object };

export class VfxSpawner {
    /** Hit flash on a lootable prop (used on each shake cycle). */
    static spawnHit(worldPos: Vector3): void {
        const res = ResourcesC.getResource<FxResource>("fx", "Hit");
        if (!res?.texture) return;

        FXC.SpawnFX(worldPos, res.texture, {
            frames_count_x: 3,
            frames_count_y: 3,
            frames_count_total: 9,
            scale: { x: 2.5, y: 2.5 },
            interval: 30,
            alpha: 1,
            repeat: { x: 1 / 3, y: 1 / 3 },
        });
    }

    /** Destruction burst when a prop is fully broken. */
    static spawnBreak(worldPos: Vector3): void {
        const res = ResourcesC.getResource<FxResource>("fx", "Break");
        if (!res?.texture) return;

        FXC.SpawnFX(worldPos, res.texture, {
            frames_count_x: 4,
            frames_count_y: 4,
            frames_count_total: 16,
            scale: { x: 3.5, y: 3.5 },
            interval: 40,
            alpha: 1,
            repeat: { x: 1 / 4, y: 1 / 4 },
        });
    }

    /** Sparkle that plays when the player collects a resource. */
    static spawnResCollected(worldPos: Vector3): void {
        const res = ResourcesC.getResource<FxResource>("fx", "ResCollected");
        if (!res?.texture) return;

        FXC.SpawnFX(worldPos, res.texture, {
            frames_count_x: 7,
            frames_count_y: 2,
            frames_count_total: 14,
            scale: { x: 2.5, y: 2.5 },
            interval: 30,
            alpha: 1,
            repeat: { x: 1 / 7, y: 1 / 2 },
        });
    }

    /** Impact flash displayed at the target position each time the player fires. */
    static spawnShootEffect(worldPos: Vector3): void {
        const res = ResourcesC.getResource<FxResource>("fx", "Hit");
        if (!res?.texture) return;

        FXC.SpawnFX(worldPos, res.texture, {
            frames_count_x: 3,
            frames_count_y: 3,
            frames_count_total: 9,
            scale: { x: 2.2, y: 2.2 },
            interval: 25,
            alpha: 0.9,
            repeat: { x: 1 / 3, y: 1 / 3 },
        });
    }

    /** Dust poof used when a prop respawns. */
    static spawnSpawn(worldPos: Vector3): void {
        const res = ResourcesC.getResource<FxResource>("fx", "Step");
        if (!res?.texture) return;

        FXC.SpawnFX(worldPos, res.texture, {
            frames_count_x: 3,
            frames_count_y: 3,
            frames_count_total: 9,
            scale: { x: 3.2, y: 3.2 },
            interval: 35,
            alpha: 0.8,
            repeat: { x: 1 / 3, y: 1 / 3 },
        });
    }
}
