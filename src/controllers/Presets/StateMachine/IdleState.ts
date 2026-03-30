import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { WeaponType } from "../Enums/WeaponType";
import { IState } from "../Interfaces/stateMachine";

export class IdleState implements IState {
    constructor(private character: Character) {}

    onEnter() {
        this.character.playAnimation(BaseAnimation.Idle);
        this.character.setWeaponLoadout(WeaponType.Unarmed);
    }

    onUpdate(_delta: number) {}

    onExit() {
    }
}
