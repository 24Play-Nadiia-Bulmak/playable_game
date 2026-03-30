import { Delegate } from "@24tools/playable_template";
import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { RotationC } from "../Movement/RotationC";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { TriggerZone } from "../Trigger/TriggerZone";
import { LootProp } from "../LootProp/LootProp";
import { Player } from "../Player";
import { HudC } from "../UI/HudC";
import { VfxSpawner } from "../Spawner/VfxSpawner";
import { Vector3 } from "quarks.core";
import { LOOT } from '../Constants/loot';
import { IState } from "../Interfaces/stateMachine";
import { WeaponType } from "../Enums/WeaponType";

export class LootState implements IState {
    private _onLoopDelegate: Delegate<{}>;
    private _lockedTriggers: TriggerZone[] = [];
    private _cycleTimer: number = 0;
    private _shakeTriggered: boolean = false;
    private _damageTriggered: boolean = false;

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
            this._damageTriggered = false;
        });
    }

    private _applyDamageTo(trigger: TriggerZone): void {
        const prop = trigger.data as LootProp | null;
        if (!prop) return;

        prop.takeDamage(LOOT.DAMAGE_PER_HIT);

        const resourceType = trigger.resourceType;
        const collectPos = trigger.position.clone();
        Player.inventory.addResource(resourceType, 1);
        HudC.flyToHud(resourceType, collectPos);
        const vfxPos = collectPos.clone();
            vfxPos.y += LOOT.VFX_Y_OFFSET;
            vfxPos.z += LOOT.VFX_Z_OFFSET;
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
        this._damageTriggered = false;
        this.character.playAnimation(BaseAnimation.Loot);
        this.character.onAnimLoop.addListener(this._onLoopDelegate);
        this.character.setWeaponLoadout(WeaponType.Unarmed);
    }
    
    onUpdate(delta: number) {
        const exited = this._lockedTriggers.filter(t => !t.isPlayerInside);
        for (const trigger of exited) {
            (trigger.data as LootProp | null)?.hideBar();
        }
        if (exited.length > 0) {
            this._lockedTriggers = this._lockedTriggers.filter(t => t.isPlayerInside);
        }

        const wasEmpty = this._lockedTriggers.length === 0;
        const allActive = TriggerSystem.getAllActiveLootTriggers(["wood", "stone", "herb"]);
        for (const trigger of allActive) {
            if (this._lockedTriggers.includes(trigger)) continue;
            this._lockedTriggers.push(trigger);
            (trigger.data as LootProp | null)?.showBar();
            if (this._shakeTriggered) {
                (trigger.data as LootProp | null)?.shake();
                VfxSpawner.spawnHit(trigger.position.clone().add(new Vector3(0, LOOT.VFX_Y_OFFSET, 0)));
            }
        }

        if (wasEmpty && this._lockedTriggers.length > 0) {
            this.character.playAnimation(BaseAnimation.Loot);
            this._cycleTimer = 0;
            this._shakeTriggered = false;
            this._damageTriggered = false;
        }

        this.rotation.lookAtTarget = this._getNearestLockedTrigger()?.position ?? null;

        if (this._lockedTriggers.length > 0) {
            this._cycleTimer += delta;
            if (!this._shakeTriggered && this._cycleTimer >= this._lootDuration / LOOT.SHAKE_THRESHOLD_DIVISOR) {
                this._shakeTriggered = true;
                for (const trigger of this._lockedTriggers) {
                    (trigger.data as LootProp | null)?.shake();
                    VfxSpawner.spawnHit(trigger.position.clone().add(new Vector3(0, LOOT.VFX_Y_OFFSET, 0)));
                }
            }

            if (!this._damageTriggered && this._cycleTimer >= this._lootDuration * LOOT.DAMAGE_THRESHOLD_RATIO) {
                this._damageTriggered = true;
                this._applyDamage();
            }
        }

        this.character.setPartVisible("Weapon_Hand", true);
    }

    onExit() {
        this.character.onAnimLoop.removeListeners(this._onLoopDelegate);
        this.rotation.lookAtTarget = null;
        for (const trigger of this._lockedTriggers) {
            (trigger.data as LootProp | null)?.hideBar();
        }
        this._lockedTriggers = [];
        this._cycleTimer = 0;
        this._shakeTriggered = false;
        this._damageTriggered = false;
        this.character.setWeaponLoadout(WeaponType.Unarmed);
    }
}