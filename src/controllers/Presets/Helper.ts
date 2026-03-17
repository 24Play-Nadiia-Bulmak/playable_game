import { Vec3 } from "cannon-es";
import { Vector3 } from "three";

/**
 * Vec3(cannon) To Vector3(three)
 */
export function Vector3CToT(value: Vec3) {
    return new Vector3(value.x, value.y, value.z);
}

/**
 * Vector3(three) To Vec3(cannon)
 */
export function Vector3TToC(value: Vector3) {
    return new Vec3(value.x, value.y, value.z);
}