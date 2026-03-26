import { Delegate, UpdateController } from "@24tools/playable_template";
import { IMoveInput } from "../Input/MoveInput";
import { Vector3 } from "three";

export class MoveC {
    private input: IMoveInput;
    private speed: number = 5;
    private moveDirection: Vector3 = new Vector3(0, 0, 0);
    
    private acceleration: number; 
    private deceleration: number; 

    get Weight() { return this.moveDirection.length() / this.speed };

    constructor(input: IMoveInput, speed: number = 5, accel: number = 8, decel: number = 10) {
        this.input = input;
        this.speed = speed;
        this.acceleration = accel;
        this.deceleration = decel;
        
        const updateDelegate = new Delegate<number>(this.update.bind(this));
        UpdateController.Instance.onUpdate.addListener(updateDelegate);
    }

    private update(delta: number) {
        const targetVelocity = this.input.CurrentDirection.clone().multiplyScalar(this.speed);
        
        if (targetVelocity.length() > 0.1 && this.moveDirection.length() > 0.1) {
            const dot = targetVelocity.clone().normalize().dot(this.moveDirection.clone().normalize());
            
            if (dot < -0.5) {
                this.moveDirection.multiplyScalar(0.2);
            }
        }

        const isStopping = targetVelocity.length() < 0.01;
        const lerpSpeed = isStopping ? this.deceleration : this.acceleration;

        this.moveDirection.lerp(targetVelocity, delta * lerpSpeed);

        if (isStopping && this.moveDirection.length() < 0.05) {
            this.moveDirection.set(0, 0, 0);
        }
    }

    get Direction() { return this.moveDirection; }
}