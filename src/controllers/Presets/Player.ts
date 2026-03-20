import { Delegate, ResourcesC, UpdateController } from "@24tools/playable_template";
import { Character } from "./Character/Character";
import { ResourcesType } from "./Enums/ResourcesType";
import { MeshType } from "./Enums/MeshType";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { BaseAnimation } from "./Enums/BaseAnimation";
import { PhysicsBody, PhysicsLayer } from "../PhysicsC";
import { Object3D } from "three";
import { ThreeC } from "../ThreeC";
import { PlayerInput } from "./Input/PlayerInput";
import { MoveC } from "./Movment/MoveC";
import { Vector3CToT, Vector3TToC } from "./Helper";
import { RotationC } from "./Movment/RotationC";
import { FollowCameraC } from "./Movment/CameraMovment/FollowCamera";
import * as THREE from 'three';
import { MovementState } from "./Enums/MovementState";

export class Player {
    private static inited: boolean = false;
    private static movementState: MovementState = MovementState.Idle;
    private static isJumping: boolean = false;
    private static IsAttacking: boolean = false;

    private static updateDelegate: Delegate<number>;

    private static container: Object3D = new Object3D;
    private static input: PlayerInput;
    private static movement: MoveC;
    private static rotation: RotationC;

    static character: Character;
    static physics: PhysicsBody;

    static get diraction() {
        return this.input.CurrentDirection;
    }

    static Init() {
        if (this.inited) return;
        this.inited = true
        const asset = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.Character)
        this.character = new Character(asset);

        this.character.playAnimation(BaseAnimation.Idle)
        this.container.add(this.character.tObj); // контейнер для візуального представлення гравця, який буде рухатися по фізиці, а не сама модель, щоб не було проблем з колізією та анімацією
        ThreeC.addToScene(this.container);

        this.container.position.set(0, 0, 0);

        this.InitPhisic();
        const input = new PlayerInput();
        this.input = input;
        const speed = 4;
        const acceleration = 3;
        // const deceleration = 20;
        this.movement = new MoveC(this.input, speed, acceleration);
        this.rotation = new RotationC(this.container, this.input, speed, false); // not only forward moving

        this.updateDelegate = new Delegate<number>((delta) => this.Update(delta)); // прив'язуємо оновлення гравця до загального оновлення гри
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate); // додаємо наш метод оновлення до контролера оновлення, щоб він викликався кожного кадру

        FollowCameraC.Init(this.container); // ініціалізуємо камеру, щоб вона слідувала за гравцем
    }

    private static InitPhisic() {
        this.physics = new PhysicsBody(
            this.container,
            false,
            1,
            PhysicsLayer.Player,
            PhysicsLayer.Wall | PhysicsLayer.Npc,
        );
        (this.physics.getPhysicsBody() as any).userData = { name: "player" }; // додаємо userData для можливості ідентифікувати це тіло при колізії
    }

    private static UpdateMovementState(dir: THREE.Vector3, weight: number) {
        if (dir.length() < 0.01) {
            this.SetState(MovementState.Idle, weight);
            return;
        }

        const norm = dir.clone().normalize();
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.container.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.container.quaternion);

        const fwdDot = norm.dot(forward);
        const rightDot = norm.dot(right);

        let state: MovementState;
        if (fwdDot > 0.5) {
            state = MovementState.Forward;
        } else if (fwdDot < -0.5) {
            state = MovementState.Back;
        } else {
            state = rightDot >= 0 ? MovementState.StrafeLeft : MovementState.StrafeRight;
        }

        this.SetState(state, weight);
    }

    private static SetState(state: MovementState, weight: number) {
        this.rotation.enabled = (state === MovementState.Forward);

        if (state !== this.movementState) {
            switch (state) {
                case MovementState.Idle:        this.character.playAnimation(BaseAnimation.Idle); break;
                case MovementState.Forward:     this.character.playAnimation(BaseAnimation.Run); break;
                case MovementState.StrafeRight: this.character.playAnimation(BaseAnimation.PistolRight); break;
                case MovementState.StrafeLeft:  this.character.playAnimation(BaseAnimation.PistolLeft); break;
                case MovementState.Back:        this.character.playAnimation(BaseAnimation.PistolBack); break;
            }
            this.movementState = state;
        }

        if (state !== MovementState.Idle) {
            this.AnimationValue = weight;
        }
    }

    private static StartLooting() {
        if (this.IsAttacking) return;
        this.character.playAnimation(BaseAnimation.Loot);
        this.IsAttacking = true;
    }

    private static StopLooting() {
        if (!this.IsAttacking) return;
        this.character.playAnimation(BaseAnimation.Idle);
        this.AnimationValue = 1;
        this.IsAttacking = false;
    }

    private static checkCollision() {
        this.physics.getPhysicsBody().addEventListener("collide", (e) => {
            const name = (e.body as any).userData?.name;
            if (e.body.collisionFilterGroup === PhysicsLayer.Wall) {
                console.log("collided with wall:", name);
                return true;
            }
        });
    }

    private static set AnimationValue(value: number) {
        this.character.AnimationSpeed = value;
        this.character.AnimationWeight = value * 12.5 + 87.5;
    }

    private static Update(delta: number) {
        const dir = this.movement.Diraction;
        const weight = this.movement.Weight;

        this.UpdateMovementState(dir, weight);

        const cPos = Vector3TToC(dir);
        this.physics.getPhysicsBody().velocity.copy(cPos);
        this.MoveVisual(delta);
    }

    private static MoveVisual(delta: number) {
        const lerpSpeed = 20;
        const targetPos = (Vector3CToT(this.physics.getPhysicsBody().position));

        this.container.position.lerp(targetPos, delta * lerpSpeed)
    }
}

