import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { RotationC } from "../Movment/RotationC";
import { TriggerSystem } from "../Trigger/TriggerSystem";
import { IState } from "./StateMachine";

export class LootState implements IState {
    private _lastAnim: BaseAnimation | null = null;

    constructor(
        private character: Character,
        private rotation: RotationC,
        private getIsStopped: () => boolean,
    ) {}

    onEnter() {
        this._lastAnim = null;
    }

    onUpdate(_delta: number) {
        const isStopped = this.getIsStopped();

        if (isStopped) {
            const woodPos = TriggerSystem.getNearestActivePosition("wood");
            this.rotation.lookAtTarget = woodPos;
            this.playIfChanged(BaseAnimation.Loot);
        } else {
            this.rotation.lookAtTarget = null;
            this.playIfChanged(BaseAnimation.Run);
        }
    }

    onExit() {
        this.rotation.lookAtTarget = null;
        this._lastAnim = null;
    }

    private playIfChanged(anim: BaseAnimation) {
        if (this._lastAnim !== anim) {
            this._lastAnim = anim;
            this.character.playAnimation(anim);
        }
    }
}