import { Vector3 } from "three";
import { IMoveInput } from "./MoveInput";

export class NpcInput implements IMoveInput {
    private currentDirection: Vector3 = new Vector3();
    private timer: number = 0;
    private moveDuration: number = 0;
    private idleDuration: number = 0;
    private isIdle: boolean = false;

    private static readonly MIN_MOVE = 1.5;
    private static readonly MAX_MOVE = 4.0;
    private static readonly MIN_IDLE = 0.5;
    private static readonly MAX_IDLE = 2.0;

    get CurrentDirection(): Vector3 {
        return this.currentDirection.clone();
    }

    constructor() {
        this.pickNewDirection();
    }

    update(delta: number) {
        this.timer += delta;

        if (this.isIdle) {
            if (this.timer >= this.idleDuration) {
                this.timer = 0;
                this.pickNewDirection();
            }
        } else {
            if (this.timer >= this.moveDuration) {
                this.timer = 0;
                this.goIdle();
            }
        }
    }

    private pickNewDirection() {
        const angle = Math.random() * Math.PI * 2;
        this.currentDirection.set(Math.sin(angle), 0, Math.cos(angle));
        this.moveDuration = NpcInput.MIN_MOVE + Math.random() * (NpcInput.MAX_MOVE - NpcInput.MIN_MOVE);
        this.isIdle = false;
    }

    private goIdle() {
        this.currentDirection.set(0, 0, 0);
        this.idleDuration = NpcInput.MIN_IDLE + Math.random() * (NpcInput.MAX_IDLE - NpcInput.MIN_IDLE);
        this.isIdle = true;
    }
}
