import { UpdateController } from '@24tools/playable_template';
import { Player } from '../Player';
import { TriggerZone } from './TriggerZone';
import { Vector3 } from 'three';

export class TriggerSystem {
    private static triggers: TriggerZone[] = [];

    static init() {
        UpdateController.Instance.onUpdate.addDelegate(() => {
            this.update();
        });
    }

    static addTrigger(trigger: TriggerZone) {
        this.triggers.push(trigger);
    }

    static removeTrigger(trigger: TriggerZone) {
        trigger.destroy();
        this.triggers = this.triggers.filter(t => t !== trigger);
    }

    static getNearestActivePosition(resourceType: string): Vector3 | null {
        let nearest: TriggerZone | null = null;
        let nearestDist = Infinity;
        const playerPos = Player.Position;

        for (const trigger of this.triggers) {
            if (trigger.resourceType !== resourceType || !trigger.isPlayerInside) continue;
            const dist = playerPos.distanceTo(trigger.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = trigger;
            }
        }
        return nearest ? nearest.position.clone() : null;
    }

    static getNearestActiveTrigger(resourceType: string): TriggerZone | null {
        let nearest: TriggerZone | null = null;
        let nearestDist = Infinity;
        const playerPos = Player.Position;

        for (const trigger of this.triggers) {
            if (trigger.resourceType !== resourceType || !trigger.isPlayerInside) continue;
            const dist = playerPos.distanceTo(trigger.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = trigger;
            }
        }

        return nearest ?? null;
    }

    static getNearestActiveLootTrigger(types: string[]): TriggerZone | null
    {
        let nearest: TriggerZone | null = null;
        let nearestDist = Infinity;
        const playerPos = Player.Position;

        for (const trigger of this.triggers)
        {
            if (!types.includes(trigger.resourceType) || !trigger.isPlayerInside) continue;
            const dist = playerPos.distanceTo(trigger.position);
            if (dist < nearestDist)
            {
                nearestDist = dist;
                nearest = trigger;
            }
        }
        return nearest ?? null;
    }

    static getAllActiveLootTriggers(types: string[]): TriggerZone[]
    {
        return this.triggers.filter(t => types.includes(t.resourceType) && t.isPlayerInside);
    }

    static hasAnyActiveTrigger(resourceType: string): boolean {
        return this.triggers.some(t => t.resourceType === resourceType && t.isPlayerInside);
    }

    static hasAnyActiveLootTrigger(types: string[]): boolean
    {
        return this.triggers.some(t => types.includes(t.resourceType) && t.isPlayerInside);
    }

    private static update() {
        const playerPos =  Player.Position;
        for (const trigger of this.triggers) {
            trigger.check(playerPos);
        }
    }
}