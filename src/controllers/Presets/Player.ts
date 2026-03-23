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
import { StateMachine } from "./StateMachine/StateMachine";
import { IdleState } from "./StateMachine/IdleState";
import { RunState } from "./StateMachine/RunState";
import { LootState } from "./StateMachine/LootState";
import { AttackState } from "./StateMachine/AttackState";
 
export class Player {
    private static inited: boolean = false;
    static IsAttacking: boolean = false;
    static IsLooting: boolean = false;

    private static updateDelegate: Delegate<number>;

    private static container: Object3D = new Object3D;
    private static input: PlayerInput;
    private static movement: MoveC;
    private static rotation: RotationC;

    static character: Character;
    static physics: PhysicsBody;

    private static _stateMachine: StateMachine;
    private static _idleState: IdleState;
    private static _runState: RunState;
    private static _lootState: LootState;
    private static _attackState: AttackState;

    static get diraction() {
        return this.input.CurrentDirection;
    }

    static get Position() {
        return this.container.position;      
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
        const speed = 5;
        const acceleration = 3;
        // const deceleration = 20;
        this.movement = new MoveC(this.input, speed, acceleration);
        this.rotation = new RotationC(this.container, this.input, speed, true); // not only forward moving

        this.InitStateMachine();

        this.updateDelegate = new Delegate<number>((delta) => this.Update(delta)); // прив'язуємо оновлення гравця до загального оновлення гри
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate); // додаємо наш метод оновлення до контролера оновлення, щоб він викликався кожного кадру

        FollowCameraC.Init(this.container); // ініціалізуємо камеру, щоб вона слідувала за гравцем
    }

    private static InitStateMachine() {
        this._idleState   = new IdleState(this.character);
        this._runState    = new RunState(this.character, () => this.movement.Weight);
        this._lootState   = new LootState(this.character, this.rotation, () => this.movement.Diraction.length() < 0.01);
        this._attackState = new AttackState(this.character, this.rotation, this.container, () => this.movement.Diraction);

        this._stateMachine = new StateMachine();
        this._stateMachine.changeState(this._idleState);
    }

    private static InitPhisic() {
        this.physics = new PhysicsBody(
            this.container,
            false,
            1,
            PhysicsLayer.Player,
            PhysicsLayer.Wall | PhysicsLayer.Npc,
        );
        const body = this.physics.getPhysicsBody();
        // body.userData = { name: "player" };

        body.angularFactor.set(0, 0, 0);   // блокуємо обертання від зіткнень
        body.linearDamping = 0.9;          // затухання — персонаж не ковзає після зупинки
        body.sleepSpeedLimit = 0;  
    }

    private static UpdateMovementState(dir: THREE.Vector3) {
        const isStopped = dir.length() < 0.01;
        const sm = this._stateMachine;

        if (this.IsAttacking) {
            if (sm.currentState !== this._attackState) {
                sm.changeState(this._attackState);
            }
            return;
        }

        if (this.IsLooting) {
            if (sm.currentState !== this._lootState) {
                sm.changeState(this._lootState);
            }
            return;
        }

        if (isStopped) {
            if (sm.currentState !== this._idleState) {
                sm.changeState(this._idleState);
            }
        } else {
            if (sm.currentState !== this._runState) {
                sm.changeState(this._runState);
            }
        }
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

    private static Update(delta: number) {
        const dir = this.movement.Diraction;

        this.UpdateMovementState(dir);
        this._stateMachine.update(delta);

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

