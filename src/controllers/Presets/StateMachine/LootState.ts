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
import { VfxSpawner } from "../Prop/VfxSpawner";

export class LootState implements IState {
    private _onLoopDelegate: Delegate<{}>;
    private _lockedTrigger: TriggerZone | null = null;
    private _cycleTimer: number = 0;
    private _shakeTriggered: boolean = false;

    private get _lootDuration(): number {
        return this.character.animationList[BaseAnimation.Loot]?.duration ?? 1.5;
    }

    constructor(
        private character: Character,
        private rotation: RotationC,
    ) {
        this._onLoopDelegate = new Delegate<{}>(() => {
            this.character.playAnimation(BaseAnimation.Loot);
            this._cycleTimer = 0;
            this._shakeTriggered = false;
            this._applyDamage();
        });
    }

    private _applyDamage(): void {
        const prop = this._lockedTrigger?.data as Prop | null;
        if (!prop) return;

        prop.takeDamage(3);

        const resourceType = this._lockedTrigger?.resourceType ?? 'wood';
        const collectPos = this._lockedTrigger?.position.clone();
        Player.inventory.addResource(resourceType, 1);
        if (collectPos) HudC.flyToHud(resourceType, collectPos);
        if (collectPos) VfxSpawner.spawnResCollected(collectPos);
    }

    onEnter() {
        this._lockedTrigger = null;
        this._cycleTimer = 0;
        this._shakeTriggered = false;
        this.character.playAnimation(BaseAnimation.Loot);
        this.character.onAnimLoop.addListener(this._onLoopDelegate);
        this.character.setPartVisible("Weapon_Hand", true);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", false);
    }
    
    onUpdate(delta: number) {
        if (this._lockedTrigger && !this._lockedTrigger.isPlayerInside) {
            // Apply the pending hit if a cycle was already in progress when the player left.
            if (this._cycleTimer > 0) this._applyDamage();
            this._lockedTrigger = null;
            this._cycleTimer = 0;
            this._shakeTriggered = false;
        }
        
        
        if (!this._lockedTrigger) {
            const found = TriggerSystem.getNearestActiveLootTrigger(["wood", "stone", "herb"]);
            if (found) {
                this._lockedTrigger = found;
                (this._lockedTrigger?.data as Prop | null)?.showBar();
                this.character.playAnimation(BaseAnimation.Loot);
                this._cycleTimer = 0;
                this._shakeTriggered = false;
            }
        }

        this.rotation.lookAtTarget = this._lockedTrigger?.position ?? null;

        if (this._lockedTrigger) {
            this._cycleTimer += delta;
            if (!this._shakeTriggered && this._cycleTimer >= this._lootDuration / 3) {
                this._shakeTriggered = true;
                (this._lockedTrigger.data as Prop | null)?.shake();
            }
        }

        this.character.setPartVisible("Weapon_Hand", true);
    }

    onExit() {
        this.character.onAnimLoop.removeListeners(this._onLoopDelegate);
        this.rotation.lookAtTarget = null;
        // Apply the pending hit if a cycle was in progress when the state was exited.
        if (this._cycleTimer > 0) this._applyDamage();
        (this._lockedTrigger?.data as Prop | null)?.hideBar();
        this._lockedTrigger = null;
        this._cycleTimer = 0;
        this._shakeTriggered = false;
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", true);
    }
}