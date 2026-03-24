import { Delegate, UpdateController } from "@24tools/playable_template";
import { IMoveInput } from "../Input/MoveInput";
import { Vector3 } from "three";

// export class MoveC {
//     private input: IMoveInput;
//     private speed: number = 5;
//     private updateDelegate: Delegate<number>;
//     private moveDiraction: Vector3 = new Vector3();
//     private acceleration: number = 1.5;    // how fast speed builds up   (10-15 = snappy, 2-4 = gradual)
//     private deceleration: number = 1.5;    // how fast speed drops during direction change
//     get Diraction() { return this.moveDiraction };
//     get RawDiraction() { return this.input.CurrentDirection.multiplyScalar(this.speed); };
//     get Weight() { return this.moveDiraction.length() / this.speed };

//     constructor(Input: IMoveInput, speed: number = 5, acceleration: number = 2, deceleration: number = 2, stopDeceleration: number = 5) {
//         this.updateDelegate = new Delegate<number>(this.update.bind(this));
//         UpdateController.Instance.onUpdate.addListener(this.updateDelegate);
//         this.input = Input;
//         this.speed = speed;
//         this.acceleration = acceleration;
//         this.deceleration = deceleration;
//         // this.stopDeceleration = stopDeceleration;
//     }

//     private update(delta: number) {
//         const targetVelocity = this.input.CurrentDirection.multiplyScalar(this.speed);
//         if (targetVelocity.length() > 0.01 && this.moveDiraction.length() > 0.01) {
//             const cosAngle = targetVelocity.dot(this.moveDiraction)
//                 / (targetVelocity.length() * this.moveDiraction.length());
//             if (cosAngle < -0.5) {
//                 this.moveDiraction.set(0, 0, 0);
//             }
//         }

//         const isReleased = targetVelocity.length() < 0.01;
//         const isAccelerating = !isReleased && targetVelocity.length() > this.moveDiraction.length();

//         let lerpFactor: number;
//         if (isAccelerating) this.moveDiraction.lerp(targetVelocity, delta * this.acceleration);
//         else                  this.moveDiraction.set(0, 0, 0);

        
//     }

    
// }

export class MoveC {
    private input: IMoveInput;
    private speed: number = 5;
    private moveDirection: Vector3 = new Vector3(0, 0, 0);
    
    // Коефіцієнти для налаштування відчуттів
    private acceleration: number; 
    private deceleration: number; 

    get Weight() { return this.moveDirection.length() / this.speed };

    constructor(input: IMoveInput, speed: number = 5, accel: number = 8, decel: number = 10) {
        this.input = input;
        this.speed = speed;
        this.acceleration = accel; // Чим вище, тим швидший старт
        this.deceleration = decel; // Чим вище, тим швидша зупинка
        
        const updateDelegate = new Delegate<number>(this.update.bind(this));
        UpdateController.Instance.onUpdate.addListener(updateDelegate);
    }

    private update(delta: number) {
        // 1. Отримуємо бажану швидкість (напрямок з інпуту * макс. швидкість)
        const targetVelocity = this.input.CurrentDirection.clone().multiplyScalar(this.speed);
        
        // 2. Логіка миттєвого розвороту (щоб не було "ковзання" по дузі)
        if (targetVelocity.length() > 0.1 && this.moveDirection.length() > 0.1) {
            const dot = targetVelocity.clone().normalize().dot(this.moveDirection.clone().normalize());
            
            // Якщо кут між поточним рухом і новим інпутом більше ~120 градусів (dot < -0.5)
            // Миттєво гасимо інерцію для чутливості
            if (dot < -0.5) {
                this.moveDirection.multiplyScalar(0.2); // Або set(0,0,0) для повного стопу
            }
        }

        // 3. Визначаємо, який коефіцієнт використовувати
        const isStopping = targetVelocity.length() < 0.01;
        const lerpSpeed = isStopping ? this.deceleration : this.acceleration;

        // 4. Плавна зміна вектора (Lerp)
        // Це автоматично обробляє і розгін, і гальмування, і зміну напрямку
        this.moveDirection.lerp(targetVelocity, delta * lerpSpeed);

        // 5. "Мертва зона" для повної зупинки (щоб вектор не лишався 0.000001)
        if (isStopping && this.moveDirection.length() < 0.05) {
            this.moveDirection.set(0, 0, 0);
        }
    }

    get Direction() { return this.moveDirection; }
}