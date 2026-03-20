import { Delegate, UpdateController } from "@24tools/playable_template";
import { IMoveInput } from "../Input/MoveInput";
import { Object3D, Quaternion, Vector3 } from "three";

export class RotationC {
    private target: Object3D;
    private input: IMoveInput;
    private speed: number = 5;
    private updateDelegate: Delegate<number>;
    private currentQ: Quaternion = new Quaternion();
    private targetQ: Quaternion = new Quaternion();
    public enabled: boolean = true;

    constructor(target: Object3D, Input: IMoveInput, speed: number = 5, enabled: boolean = true) {
        this.updateDelegate = new Delegate<number>(this.update.bind(this));
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate);
        this.input = Input;
        this.speed = speed;
        this.target = target;
        this.enabled = enabled;
        this.currentQ.copy(this.target.quaternion);
        this.targetQ.copy(this.target.quaternion);
    }

    private update(delta: number) {
        if (this.enabled) {
            const loockAtStep = this.input.CurrentDirection;
            if (loockAtStep.length() != 0) {
                const loockAtPoint = this.target.position.clone().add(loockAtStep);
                this.target.lookAt(loockAtPoint);
                this.targetQ.copy(this.target.quaternion);
                this.target.quaternion.copy(this.currentQ);
            }
        }

        this.target.quaternion.slerp(this.targetQ, delta * this.speed);
        this.currentQ.copy(this.target.quaternion);
    }
}