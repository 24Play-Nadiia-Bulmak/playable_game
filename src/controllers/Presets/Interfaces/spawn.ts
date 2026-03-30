export interface SpawnConfig {
    resourceType: string;
    respawnDelay: number;
    maxCount: number;
}

export interface PendingRespawn {
    config: SpawnConfig;
    timeLeft: number;
    spawnFn: () => void;
}
