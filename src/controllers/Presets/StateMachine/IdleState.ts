import { Character } from "../Character/Character";
import { BaseAnimation } from "../Enums/BaseAnimation";
import { IState } from "./StateMachine";

export class IdleState implements IState {
    constructor(private character: Character) {}

    onEnter() {
        this.character.playAnimation(BaseAnimation.Idle);
    }

    onUpdate(_delta: number) {}

    onExit() {}
}
