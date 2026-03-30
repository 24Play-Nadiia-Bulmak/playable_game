import { ResourcesC, TweenC } from "@24tools/playable_template";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Vector3 } from "three";
import { Easing, Tween } from "@tweenjs/tween.js";
import { ThreeC } from "../../ThreeC";
import { ResourcesType } from "../Enums/ResourcesType";
import { MeshType } from "../Enums/MeshType";

export class WoodParticleSpawner {
    private static readonly PARTICLE_COUNT = 3; 
    private static readonly SPREAD_RADIUS = 2;

    static spawn(worldPosition: Vector3): void {
        const gltf = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.WoodParticle);
        if (!gltf) return;

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const instance = gltf.scene.clone(true);

            const targetX = worldPosition.x + (Math.random() - 0.5) * this.SPREAD_RADIUS;
            const targetZ = worldPosition.z + (Math.random() - 0.5) * this.SPREAD_RADIUS;
            
            instance.scale.set(0, 0, 0);
            instance.position.copy(worldPosition);

            ThreeC.addToScene(instance);

            const animData = { 
                s: 0, 
                x: worldPosition.x + (Math.random() - 0.5) * this.SPREAD_RADIUS,
                y: worldPosition.y, 
                z: worldPosition.z + (Math.random() - 0.5) * this.SPREAD_RADIUS,
            };

            const finalScale = 0.5 + Math.random() * 0.2;

            const jumpUp = new Tween(animData)
                .to({ 
                    s: finalScale,
                    x: targetX,
                    z: targetZ,
                    y: worldPosition.y + 1.2,
                }, 400)
                .easing(Easing.Quadratic.Out)
                .onUpdate(({ s, x, y, z,  }) => {
                    instance.scale.setScalar(s);
                    instance.position.set(x, y, z);
                });

            const fallDown = new Tween(animData)
                .to({ 
                    y: worldPosition.y
                }, 600)
                .easing(Easing.Bounce.Out) 
                .onUpdate(({ y }) => {
                    instance.position.y = y;
                })
                .onComplete(() => {
                     instance.removeFromParent();
                });

            jumpUp.chain(fallDown);
            
            jumpUp.start();
            TweenC.add(jumpUp);
            TweenC.add(fallDown);
        }
    }
}