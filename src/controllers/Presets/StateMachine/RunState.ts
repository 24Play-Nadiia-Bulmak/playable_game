import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { WeaponType } from "../Enums/WeaponType";
import { IState } from "../Interfaces/stateMachine";

export class RunState implements IState {
    constructor(
        private character: Character,
        private getWeight: () => number,
    ) {}

    onEnter() {
        this.character.playAnimation(BaseAnimation.Run);
        this.character.setWeaponLoadout(WeaponType.Unarmed);
    }

    onUpdate(_delta: number) {
        this.character.AnimationSpeed = this.getWeight();
    }

    onExit() {}
}