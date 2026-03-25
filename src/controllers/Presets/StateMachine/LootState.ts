import { Delegate } from "@24tools/playable_template";
import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { RotationC } from "../Movment/RotationC";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { TriggerZone } from "../Trigger/TriggerZone";
import { Prop } from "../Prop/Prop";
import { IState } from "./StateMachine";
import { Player } from "../Player";
import { HudC } from "../UI/HudC";
import { CameraC } from "../../CameraC";

export class LootState implements IState {
    private _damageTimer: number = 0;
    private readonly _damageInterval: number = 1.5;
    private _onFinishDelegate: Delegate<{}>;
    private _lockedTrigger: TriggerZone | null = null;

    constructor(
        private character: Character,
        private rotation: RotationC,
    ) {
        this._onFinishDelegate = new Delegate<{}>(() => {
            this.character.playAnimation(BaseAnimation.Loot);
        });
    }

    onEnter() {
        this._damageTimer = 0;
        this._lockedTrigger = null;
        this.character.playAnimation(BaseAnimation.Loot);
        this.character.onAnimLoop.addListener(this._onFinishDelegate);
        this.character.setPartVisible("Weapon_Hand", true);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", false);
    }

    onUpdate(delta: number) {
        if (this._lockedTrigger && !this._lockedTrigger.isPlayerInside) {
            this._lockedTrigger = null;
        }

        if (!this._lockedTrigger) {
            this._lockedTrigger = TriggerSystem.getNearestActiveLootTrigger(["wood", "stone", "herb"]);
        }

        this.rotation.lookAtTarget = this._lockedTrigger?.position ?? null;

        this._damageTimer += delta;
        if (this._damageTimer >= this._damageInterval) {
            this._damageTimer = 0;
            const prop = this._lockedTrigger?.data as Prop | null;
            prop?.shake();
            prop?.takeDamage(3);
            const resourceType = this._lockedTrigger?.resourceType ?? 'wood';
            const collectPos = this._lockedTrigger?.position.clone();
            Player.inventory.addResource(resourceType, 1);
            CameraC.shake(0.1, 0.05);
            console.log(collectPos)
            if (collectPos) HudC.flyToHud(resourceType, collectPos);
        }
        this.character.setPartVisible("Weapon_Hand", true);
    }

    onExit() {
        this.character.onAnimLoop.removeListeners(this._onFinishDelegate);
        this.rotation.lookAtTarget = null;
        (this._lockedTrigger?.data as Prop | null)?.hideBar();
        this._damageTimer = 0;
        this._lockedTrigger = null;
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", true);
    }
}