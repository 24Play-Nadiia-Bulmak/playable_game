import { Delegate, UpdateController } from "@24tools/playable_template";
import { IMoveInput } from "../Input/MoveInput";
import { Vector3 } from "three";

export class MoveC {
    private input: IMoveInput;
    private speed: number = 5;
    private updateDelegate: Delegate<number>;
    private moveDiraction: Vector3 = new Vector3();
    private acceleration: number = 1.5; // коефіцієнт прискорення, який визначає, як швидко рух гравця досягає максимальної швидкості(10-15 - різко, 2-4 - плавно);
    private deceleration: number = 1.5; // коефіцієнт уповільнення, який визначає, як швидко рух гравця зменшує швидкість(10-15 - різко, 2-4 - плавно);
    get Diraction() { return this.moveDiraction };
    get Weight() { return this.moveDiraction.length() / this.speed };

    constructor(Input: IMoveInput, speed: number = 5, acceleration: number = 2, deceleration: number = 2) {
        this.updateDelegate = new Delegate<number>(this.update.bind(this));
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate);
        this.input = Input;
        this.speed = speed;
        this.acceleration = acceleration;
        this.deceleration = deceleration;
    }

    private update(delta: number) {
        // delta *= TimeC.TimeScale;
        const moveStep = this.input.CurrentDirection.multiplyScalar(this.speed);
        
        
        const isAccelerating = moveStep.length() > this.moveDiraction.length();
        const lerpFactor = isAccelerating ? this.acceleration : this.deceleration;
        
        if (isAccelerating) {
            this.moveDiraction.lerp(moveStep, delta * lerpFactor);
        } else {
            // this.moveDiraction.lerp(moveStep, delta * lerpFactor);
            this.moveDiraction.copy(moveStep);
            // if (this.moveDiraction.length() < 0.5) {
            // }
        }
    }
}