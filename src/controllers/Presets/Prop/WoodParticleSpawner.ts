import { ResourcesC, TweenC } from "@24tools/playable_template";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Vector3 } from "three";
import { Easing, Tween } from "@tweenjs/tween.js";
import { ThreeC } from "../../ThreeC";
import { ResourcesType } from "../Enums/ResourcesType";
import { MeshType } from "../Enums/MeshType";

// export class WoodParticleSpawner {
//     private static readonly PARTICLE_COUNT = 3; 
//     private static readonly SPREAD_RADIUS = 0.5;

//     static spawn(worldPosition: Vector3): void {
//         const gltf = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.WoodParticle);
//         if (!gltf) return;

//         for (let i = 0; i < this.PARTICLE_COUNT; i++) {
//             const instance = gltf.scene.clone(true);

//             const offsetX = (Math.random() - 0.5) * this.SPREAD_RADIUS;
//             const offsetZ = (Math.random() - 0.5) * this.SPREAD_RADIUS;
            
//             instance.scale.set(0, 0, 0);
//             instance.position.set(
//                 worldPosition.x + offsetX,
//                 worldPosition.y, 
//                 worldPosition.z + offsetZ
//             );

//             instance.rotation.set(
//                 Math.random() * Math.PI,
//                 Math.random() * Math.PI,
//                 Math.random() * Math.PI
//             );

//             ThreeC.addToScene(instance);

//             const animData = { 
//                 s: 0, 
//                 y: worldPosition.y, 
//                 ry: instance.rotation.y,
//                 rx: instance.rotation.x
//             };

//             // 1. ФАЗА: Стрибок вгору та масштабування (Pop up)
//             const jumpUp = new Tween(animData)
//                 .to({ 
//                     s: 0.4 + Math.random() * 0.3,
//                     y: worldPosition.y + 0.8 + Math.random() * 0.5,
//                     ry: animData.ry + Math.PI
//                 }, 400 + Math.random() * 200)
//                 .easing(Easing.Quadratic.Out)
//                 .onUpdate(({ s, y, ry }) => {
//                     instance.scale.setScalar(s);
//                     instance.position.y = y;
//                     instance.rotation.y = ry;
//                 });

//             // 2. ФАЗА: Падіння та зникнення (Fall & Fade)
//             const fallDown = new Tween(animData)
//                 .to({ 
//                     s: 0, 
//                     y: worldPosition.y - 0.2,
//                     rx: animData.rx + Math.PI * 2
//                 }, 600 + Math.random() * 400)
//                 .easing(Easing.Quadratic.In)
//                 .onUpdate(({ s, y, rx }) => {
//                     instance.scale.setScalar(s);
//                     instance.position.y = y;
//                     instance.rotation.x = rx;
//                 })
//                 .onComplete(() => {
//                     instance.removeFromParent();
//                 });

//             jumpUp.chain(fallDown);
//             jumpUp.start();
//             TweenC.add(jumpUp);
//             TweenC.add(fallDown);
//         }
//     }
// }

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

            instance.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            ThreeC.addToScene(instance);

            const animData = { 
                s: 0, 
                x: worldPosition.x,
                y: worldPosition.y, 
                z: worldPosition.z,
                ry: instance.rotation.y
            };

            // Кінцевий розмір моделі (можна налаштувати під свій ассет)
            const finalScale = 0.5 + Math.random() * 0.2;

            // 1. ФАЗА: Стрибок вгору та розліт в сторони (Arc Launch)
            const jumpUp = new Tween(animData)
                .to({ 
                    s: finalScale,
                    x: targetX, // Рух вбік починається одразу
                    z: targetZ,
                    y: worldPosition.y + 1.2, // Висота стрибка
                    ry: animData.ry + Math.PI // Обертання в польоті
                }, 400)
                .easing(Easing.Quadratic.Out)
                .onUpdate(({ s, x, y, z, ry }) => {
                    instance.scale.setScalar(s);
                    instance.position.set(x, y, z);
                    instance.rotation.y = ry;
                });

            // 2. ФАЗА: Падіння з відскоком (Bounce Down)
            const fallDown = new Tween(animData)
                .to({ 
                    y: worldPosition.y // Повернення на початковий рівень Y
                }, 600)
                // Bounce.Out створює ефект "м'ячика", що стрибає по землі
                .easing(Easing.Bounce.Out) 
                .onUpdate(({ y }) => {
                    instance.position.y = y;
                })
                .onComplete(() => {
                    // Тут об'єкт просто залишається на сцені
                    // Якщо потрібно, щоб він зник через час, можна додати delay і ще один Tween
                     instance.removeFromParent();
                });

            jumpUp.chain(fallDown);
            
            jumpUp.start();
            TweenC.add(jumpUp);
            TweenC.add(fallDown);
        }
    }

//     static spawn(worldPosition: Vector3): void {
//     const gltf = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.WoodParticle);
//     if (!gltf) return;

//     for (let i = 0; i < this.PARTICLE_COUNT; i++) {
//         const instance = gltf.scene.clone(true);
//         ThreeC.addToScene(instance);

//         // 1. Точка приземлення (куди летить)
//         const targetX = worldPosition.x + (Math.random() - 0.5) * this.SPREAD_RADIUS;
//         const targetZ = worldPosition.z + (Math.random() - 0.5) * this.SPREAD_RADIUS;
        
//         // 2. Точка відскоку (куди підстрибує після приземлення)
//         const bounceX = targetX + (Math.random() - 0.5) * 0.3;
//         const bounceZ = targetZ + (Math.random() - 0.5) * 0.3;

//         instance.scale.set(0, 0, 0);
//         instance.position.copy(worldPosition);

//         const animData = { s: 0, x: worldPosition.x, y: worldPosition.y, z: worldPosition.z };

//         // ФАЗА 1: Виліт (Arc)
//         const jump = new Tween(animData)
//             .to({ s: 0.5, x: targetX, y: worldPosition.y + 1.0, z: targetZ }, 400)
//             .easing(Easing.Quadratic.Out)
//             .onUpdate((obj) => {
//                 instance.scale.setScalar(obj.s);
//                 instance.position.set(obj.x, obj.y, obj.z);
//             });

//         // ФАЗА 2: Відскок (Bounce)
//         const bounce = new Tween(animData)
//             .to({ x: bounceX, y: worldPosition.y + 0.3, z: bounceZ }, 300)
//             .easing(Easing.Quadratic.Out)
//             .onUpdate((obj) => {
//                 instance.position.set(obj.x, obj.y, obj.z);
//             });

//         // ФАЗА 3: Приземлення (Settle)
//         const settle = new Tween(animData)
//             .to({ x: bounceX, y: worldPosition.y, z: bounceZ }, 200)
//             .easing(Easing.Quadratic.In)
//             .onUpdate((obj) => {
//                 instance.position.set(obj.x, obj.y, obj.z);
//             });

//         // Ланцюжок анімацій
//         jump.chain(bounce);
//         bounce.chain(settle);

//         jump.start();
//         TweenC.add(jump);
//         TweenC.add(bounce);
//         TweenC.add(settle);
//     }
// }

// static spawn(worldPosition: Vector3): void {
//     const gltf = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.WoodParticle);
//     if (!gltf) return;

//     for (let i = 0; i < this.PARTICLE_COUNT; i++) {
//         const instance = gltf.scene.clone(true);
//         ThreeC.addToScene(instance);

//         const targetX = worldPosition.x + (Math.random() - 0.5) * 1.5;
//         const targetZ = worldPosition.z + (Math.random() - 0.5) * 1.5;
        
//         instance.scale.set(0, 0, 0);
//         instance.position.copy(worldPosition);

//         const animData = { 
//             s: 0, 
//             y: worldPosition.y, 
//             x: worldPosition.x, 
//             z: worldPosition.z,
//             scaleY: 1 // Для ефекту Squash
//         };

//         // 1. Основний стрибок (Launch)
//         const jump = new Tween(animData)
//             .to({ s: 0.5, x: targetX, y: worldPosition.y + 1.2, z: targetZ }, 400)
//             .easing(Easing.Quadratic.Out);

//         // 2. Перший відскок (Bounce 1)
//         const bounce1 = new Tween(animData)
//             .to({ y: worldPosition.y + 0.4 }, 300)
//             .easing(Easing.Quadratic.Out)
//             .yoyo(true) // Вбудований механізм "туди-сюди"
//             .repeat(1); 

//         // 3. Фінальна стабілізація
//         const settle = new Tween(animData)
//             .to({ s: 0.5 }, 100)
//             .onUpdate((obj) => {
//                 instance.scale.setScalar(obj.s);
//                 instance.position.set(obj.x, obj.y, obj.z);
//             });

//         // Ланцюжок для більш плавного та "важкого" руху
//         jump.chain(bounce1);
//         bounce1.chain(settle);

//         jump.onUpdate((obj) => {
//             instance.scale.setScalar(obj.s);
//             instance.position.set(obj.x, obj.y, obj.z);
//             // Додаємо ефект розтягнення при польоті
//             instance.scale.y = obj.s * 1.2; 
//         });

//         jump.start();
//         TweenC.add(jump);
//         TweenC.add(bounce1);
//         TweenC.add(settle);
//     }
// }
}