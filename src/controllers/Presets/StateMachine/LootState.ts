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
import { vfx } from "../../../resources/vfx/vfx";
import { Vector3 } from "quarks.core";

export class LootState implements IState {
    private _onLoopDelegate: Delegate<{}>;
    private _lockedTriggers: TriggerZone[] = [];
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
            const elapsed = this._cycleTimer;
            this.character.playAnimation(BaseAnimation.Loot);
            this._cycleTimer = 0;
            this._shakeTriggered = false;
            if (elapsed >= this._lootDuration * 0.5) {
                this._applyDamage();
            }
        });
    }

    private _applyDamageTo(trigger: TriggerZone): void {
        const prop = trigger.data as Prop | null;
        if (!prop) return;

        prop.takeDamage(3);

        const resourceType = trigger.resourceType;
        const collectPos = trigger.position.clone();
        Player.inventory.addResource(resourceType, 1);
        HudC.flyToHud(resourceType, collectPos);
        const vfxPos = collectPos.clone();
            vfxPos.y += 1.0;
            vfxPos.z += 0.5;
        VfxSpawner.spawnResCollected(vfxPos);
    }

    private _applyDamage(): void {
        for (const trigger of [...this._lockedTriggers]) {
            this._applyDamageTo(trigger);
        }
    }

    private _getNearestLockedTrigger(): TriggerZone | null {
        if (this._lockedTriggers.length === 0) return null;
        const playerPos = Player.Position;
        let nearest = this._lockedTriggers[0];
        let nearestDist = playerPos.distanceTo(nearest.position);
        for (let i = 1; i < this._lockedTriggers.length; i++) {
            const dist = playerPos.distanceTo(this._lockedTriggers[i].position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = this._lockedTriggers[i];
            }
        }
        return nearest;
    }

    onEnter() {
        this._lockedTriggers = [];
        this._cycleTimer = 0;
        this._shakeTriggered = false;
        this.character.playAnimation(BaseAnimation.Loot);
        this.character.onAnimLoop.addListener(this._onLoopDelegate);
        this.character.setPartVisible("Weapon_Hand", true);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", false);
    }
    
    onUpdate(delta: number) {
        const exited = this._lockedTriggers.filter(t => !t.isPlayerInside);
        for (const trigger of exited) {
            (trigger.data as Prop | null)?.hideBar();
        }
        if (exited.length > 0) {
            this._lockedTriggers = this._lockedTriggers.filter(t => t.isPlayerInside);
        }

        const wasEmpty = this._lockedTriggers.length === 0;
        const allActive = TriggerSystem.getAllActiveLootTriggers(["wood", "stone", "herb"]);
        for (const trigger of allActive) {
            if (this._lockedTriggers.includes(trigger)) continue;
            this._lockedTriggers.push(trigger);
            (trigger.data as Prop | null)?.showBar();
            if (this._shakeTriggered) {
                (trigger.data as Prop | null)?.shake();
                VfxSpawner.spawnHit(trigger.position.clone().add(new Vector3(0, 1, 0)));
            }
        }

        if (wasEmpty && this._lockedTriggers.length > 0) {
            this.character.playAnimation(BaseAnimation.Loot);
            this._cycleTimer = 0;
            this._shakeTriggered = false;
        }

        this.rotation.lookAtTarget = this._getNearestLockedTrigger()?.position ?? null;

        if (this._lockedTriggers.length > 0) {
            this._cycleTimer += delta;
            if (!this._shakeTriggered && this._cycleTimer >= this._lootDuration / 3) {
                this._shakeTriggered = true;
                for (const trigger of this._lockedTriggers) {
                    (trigger.data as Prop | null)?.shake();
                    VfxSpawner.spawnHit(trigger.position.clone().add(new Vector3(0, 1, 0)));
                }
            }
        }

        this.character.setPartVisible("Weapon_Hand", true);
    }

    onExit() {
        this.character.onAnimLoop.removeListeners(this._onLoopDelegate);
        this.rotation.lookAtTarget = null;
        for (const trigger of this._lockedTriggers) {
            (trigger.data as Prop | null)?.hideBar();
        }
        this._lockedTriggers = [];
        this._cycleTimer = 0;
        this._shakeTriggered = false;
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", true);
    }
}