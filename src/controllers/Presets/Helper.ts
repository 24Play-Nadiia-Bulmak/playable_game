import { Vec3 } from "cannon-es";
import { Vector3, BoxHelper, Object3D, WireframeGeometry, LineSegments, LineBasicMaterial, Color } from "three";
import { ThreeC } from "../ThreeC";

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

/**
 * Add bounding box helper (AABB - axis-aligned bounding box)
 * Shows a wireframe box around the object
 */
export function addBoundingBoxHelper(obj: Object3D, color: number = 0x00ff00) {
    const helper = new BoxHelper(obj, color);
    ThreeC.addToScene(helper);
    return helper;
}

/**
 * Add wireframe helper to show mesh structure
 * Useful for seeing collision shapes
 */
export function addWireframeHelper(obj: Object3D, color: number = 0xff0000) {
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

/**
 * Enable physics body visualization for debugging
 * Shows cannon-es physics bodies in the scene
 * Call this in your initialization code
 */
export function enablePhysicsDebug() {
    // This is handled via Template.debug.physics = true in beforeResourcesLoadedCb
    console.log("Physics debug enabled. Check your Template config.");
}

/**
 * Remove all helper lines from scene (cleanup)
 */
export function clearAllHelpers() {
    const helpersToRemove: any[] = [];
    ThreeC.scene.traverse((child) => {
        if (child instanceof BoxHelper || (child instanceof LineSegments && child.material instanceof LineBasicMaterial)) {
            helpersToRemove.push(child);
        }
    });
    helpersToRemove.forEach(helper => ThreeC.removeFromScene(helper));
}