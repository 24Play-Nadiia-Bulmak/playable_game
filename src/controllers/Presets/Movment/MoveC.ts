import { Delegate, UpdateController } from "@24tools/playable_template";
import { IMoveInput } from "../Input/MoveInput";
import { Vector3 } from "three";

export class MoveC {
    private input: IMoveInput;
    private speed: number = 5;
    private updateDelegate: Delegate<number>;
    private moveDiraction: Vector3 = new Vector3();
    get Diraction() { return this.moveDiraction };
    get Weight() { return this.moveDiraction.length() / this.speed };

    constructor(Input: IMoveInput, speed: number = 5) {
        this.updateDelegate = new Delegate<number>(this.update.bind(this));
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate);
        this.input = Input;
        this.speed = speed;
    }

    private update(delta: number) {
        // delta *= TimeC.TimeScale;
        const moveStep = this.input.CurrentDirection.multiplyScalar(this.speed);
        this.moveDiraction.copy(moveStep);
    }
}