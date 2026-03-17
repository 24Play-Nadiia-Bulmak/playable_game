import { Vector3 } from "three";

export interface IMoveInput {
    get CurrentDirection(): Vector3;
    update(delta);
}