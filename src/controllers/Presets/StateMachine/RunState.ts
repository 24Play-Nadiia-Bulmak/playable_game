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
    }

    onUpdate(_delta: number) {
        const weight = this.getWeight();
        this.character.AnimationSpeed = weight;
        this.character.AnimationWeight = weight * 12.5 + 87.5;
    }

    onExit() {}
}