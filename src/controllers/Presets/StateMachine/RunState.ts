import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { IState } from "./StateMachine";

export class RunState implements IState {
    constructor(
        private character: Character,
        private getWeight: () => number,
    ) {}

    onEnter() {
        this.character.playAnimation(BaseAnimation.Run);
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", true);
    }

    onUpdate(_delta: number) {
        this.character.AnimationSpeed = this.getWeight();
    }

    onExit() {}
}