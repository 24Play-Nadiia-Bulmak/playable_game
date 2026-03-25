import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { IState } from "./StateMachine";

export class IdleState implements IState {
    constructor(private character: Character) {}

    onEnter() {
        this.character.playAnimation(BaseAnimation.Idle);
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", true);
    }

    onUpdate(_delta: number) {}

    onExit() {
    }
}
