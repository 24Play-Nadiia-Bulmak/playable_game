import { UpdateController } from '@24tools/playable_template';
import { Player } from '../Player';
import { TriggerZone } from './TriggerZone';

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

    private static update() {
        const playerPos =  Player.Position;
        for (const trigger of this.triggers) {
            trigger.check(playerPos);
        }
    }
}