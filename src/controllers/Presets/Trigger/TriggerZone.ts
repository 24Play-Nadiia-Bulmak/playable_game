import { Vector3, Mesh, SphereGeometry, MeshBasicMaterial, Object3D } from 'three';
import { ThreeC } from '../../ThreeC';

export class TriggerZone {
    position: Vector3;
    radius: number;
    resourceType: string;
    isPlayerInside: boolean = false;
    isActive: boolean = true;

    onEnter: (() => void) | null = null;
    onExit: (() => void) | null = null;
    onStay: (() => void) | null = null;

    data: any = null;

    private source: Object3D | null = null;
    private debugMesh: Mesh | null = null;

    constructor(position: Vector3, radius: number, resourceType: string, debug = false, source: Object3D | null = null) {
        this.position = position.clone();
        this.radius = radius;
        this.resourceType = resourceType;
        this.isPlayerInside = false;
        this.source = source;

        if (debug) {
            const geo = new SphereGeometry(radius, 8, 8);
            const mat = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
            this.debugMesh = new Mesh(geo, mat);
            this.debugMesh.position.copy(position);
            ThreeC.addToScene(this.debugMesh);
        }
    }

    check(playerPosition: Vector3) {
        if (this.source) {
            this.source.getWorldPosition(this.position);
            if (this.debugMesh) {
                this.debugMesh.position.copy(this.position);
            }
        }

        const dist = playerPosition.distanceTo(this.position);
        const inside = dist < this.radius;

        if (inside && !this.isPlayerInside) {
            this.isPlayerInside = true;
            this.onEnter?.();
        } else if (!inside && this.isPlayerInside) {
            this.isPlayerInside = false;
            this.onExit?.();
        } else if (inside && this.isPlayerInside) {
            this.onStay?.();
        }
    }

    destroy() {
        this.isActive = false;
        if (this.isPlayerInside) {
            this.isPlayerInside = false;
            this.onExit?.();
        }
        if (this.debugMesh) {
            ThreeC.scene.remove(this.debugMesh);
        }
    }
}