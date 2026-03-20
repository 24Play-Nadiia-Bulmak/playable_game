import { Vector3, Mesh, SphereGeometry, MeshBasicMaterial } from 'three';
import { ThreeC } from '../../ThreeC';

export class TriggerZone {
    position: Vector3;
    radius: number;
    resourceType: string;
    isPlayerInside: boolean = false;
    
    onEnter: (() => void) | null = null;
    onExit: (() => void) | null = null;

    private debugMesh: Mesh | null = null;
    static isPlayerInside: any;

    constructor(position: Vector3, radius: number, resourceType: string, debug = false) {
        this.position = position.clone();
        this.radius = radius;
        this.resourceType = resourceType;

        if (debug) {
            const geo = new SphereGeometry(radius, 8, 8);
            const mat = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
            this.debugMesh = new Mesh(geo, mat);
            this.debugMesh.position.copy(position);
            ThreeC.addToScene(this.debugMesh);
        }
    }

    check(playerPosition: Vector3) {
        const dist = playerPosition.distanceTo(this.position);
        const inside = dist < this.radius;

        if (inside && !this.isPlayerInside) {
            this.isPlayerInside = true;
            this.onEnter?.();
        } else if (!inside && this.isPlayerInside) {
            this.isPlayerInside = false;
            this.onExit?.();
        }
    }

    destroy() {
        if (this.isPlayerInside) {
            this.isPlayerInside = false;
            this.onExit?.();
        }
        if (this.debugMesh) {
            ThreeC.scene.remove(this.debugMesh);
        }
    }
}