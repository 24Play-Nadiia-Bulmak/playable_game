import { UpdateController } from "@24tools/playable_template";

export interface SpawnConfig {
    resourceType: string;
    respawnDelay: number;
    maxCount: number;
}

interface PendingRespawn {
    config: SpawnConfig;
    timeLeft: number;
    spawnFn: () => void;
}

export class SpawnManager
{
    private static _inited: boolean = false;
    private static _pendingRespawns: PendingRespawn[] = [];
    private static _activeCountByType: Map<string, number> = new Map();

    static init(): void
    {
        if (this._inited) return;
        this._inited = true;
        UpdateController.Instance.onUpdate.addDelegate((delta) => this._update(delta));
    }

    static trackSpawn(type: string): void
    {
        this._activeCountByType.set(type, (this._activeCountByType.get(type) ?? 0) + 1);
    }

    static trackDespawn(type: string): void
    {
        const count = this._activeCountByType.get(type) ?? 0;
        this._activeCountByType.set(type, Math.max(0, count - 1));
    }

    static getActiveCount(type: string): number
    {
        return this._activeCountByType.get(type) ?? 0;
    }

    static scheduleRespawn(config: SpawnConfig, spawnFn: () => void): void
    {
        this._pendingRespawns.push({ config, timeLeft: config.respawnDelay, spawnFn });
    }

    private static _update(delta: number): void
    {
        for (let i = this._pendingRespawns.length - 1; i >= 0; i--)
        {
            const pending = this._pendingRespawns[i];
            pending.timeLeft -= delta;

            if (pending.timeLeft <= 0)
            {
                if (this.getActiveCount(pending.config.resourceType) < pending.config.maxCount)
                {
                    pending.spawnFn();
                    this.trackSpawn(pending.config.resourceType);
                }
                this._pendingRespawns.splice(i, 1);
            }
        }
    }
}
