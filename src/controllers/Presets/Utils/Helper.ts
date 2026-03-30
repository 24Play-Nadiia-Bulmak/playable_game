import { Vec3 } from "cannon-es";
import { Vector3, BoxHelper, Object3D, WireframeGeometry, LineSegments, LineBasicMaterial } from "three";
import { ThreeC } from "../../ThreeC";
import { COLORS } from "../Constants/colors";

export function Vector3CToT(value: Vec3) {
    return new Vector3(value.x, value.y, value.z);
}

export function Vector3TToC(value: Vector3) {
    return new Vec3(value.x, value.y, value.z);
}

export function addBoundingBoxHelper(obj: Object3D, color: number = COLORS.WIREFRAME) {
    const helper = new BoxHelper(obj, color);
    ThreeC.addToScene(helper);
    return helper;
}

export function addWireframeHelper(obj: Object3D, color: number = COLORS.WIREFRAME) {
    obj.traverse((child: any) => {
        if (child.isMesh && child.geometry) {
            const wireGeometry = new WireframeGeometry(child.geometry);
            const line = new LineSegments(
                wireGeometry,
                new LineBasicMaterial({ color, linewidth: 1 })
            );
            line.position.copy(child.position);
            line.quaternion.copy(child.quaternion);
            ThreeC.addToScene(line);
        }
    });
}

export function enablePhysicsDebug() {
    console.log("Physics debug enabled. Check your Template config.");
}

export function clearAllHelpers() {
    const helpersToRemove: any[] = [];
    ThreeC.scene.traverse((child) => {
        if (child instanceof BoxHelper || (child instanceof LineSegments && child.material instanceof LineBasicMaterial)) {
            helpersToRemove.push(child);
        }
    });
    helpersToRemove.forEach(helper => ThreeC.removeFromScene(helper));
}