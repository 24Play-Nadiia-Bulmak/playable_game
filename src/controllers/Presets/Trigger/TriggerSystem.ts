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
        const nearest = this._findNearest(t => t.resourceType === resourceType && t.isPlayerInside);
        return nearest ? nearest.position.clone() : null;
    }

    static getNearestActiveTrigger(resourceType: string): TriggerZone | null {
        return this._findNearest(t => t.resourceType === resourceType && t.isPlayerInside);
    }

    static getNearestActiveLootTrigger(types: string[]): TriggerZone | null
    {
        return this._findNearest(t => types.includes(t.resourceType) && t.isPlayerInside);
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

    private static _findNearest(predicate: (t: TriggerZone) => boolean): TriggerZone | null {
        let nearest: TriggerZone | null = null;
        let nearestDist = Infinity;
        const playerPos = Player.Position;

        for (const trigger of this.triggers) {
            if (!predicate(trigger)) continue;
            const dist = playerPos.distanceTo(trigger.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = trigger;
            }
        }
        return nearest;
    }

    private static update() {
        const playerPos =  Player.Position;
        for (const trigger of this.triggers) {
            trigger.check(playerPos);
        }
    }
}