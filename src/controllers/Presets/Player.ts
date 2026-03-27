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
import { StateMachine, IState } from "./StateMachine/StateMachine";
import { IdleState } from "./StateMachine/IdleState";
import { RunState } from "./StateMachine/RunState";
import { LootState } from "./StateMachine/LootState";
import { AttackState } from "./StateMachine/AttackState";
import { ResourseSystem } from "./ResourseSystem/ResourseSystem";
import { TriggerSystem } from "./Trigger/TriggerSystem";
import { HudC } from "./UI/HudC";
import { ZombieProgressBarC } from "./UI/ZombieProgressBarC";

 
export class Player {
    private static inited: boolean = false;
    static IsAttacking: boolean = false;
    static IsLooting: boolean = false;

    static inventory: ResourseSystem;

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

    private static _isShootingFreeze: boolean = false;

    private static _detectionRing: THREE.Mesh;
    private static _detectionRingTime: number = 0;

    static get diraction() {
        return this.input.CurrentDirection;
    }

    static get forward(): THREE.Vector3 {
        const dir = new THREE.Vector3();
        this.container.getWorldDirection(dir);
        dir.y = 0;
        return dir.normalize();
    }

    static get IsIdle(): boolean {
        return !!this._stateMachine && this._stateMachine.currentState === this._idleState;
    }

    static get Position() {
        return this.container.position;      
    }

    static Init() {
        if (this.inited) return;
        this.inited = true
        const asset = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.Character)
        this.character = new Character(asset);
// console.log(this.character)
        this.character.playAnimation(BaseAnimation.Idle)
        this.container.add(this.character.tObj); // контейнер для візуального представлення гравця, який буде рухатися по фізиці, а не сама модель, щоб не було проблем з колізією та анімацією
        ThreeC.addToScene(this.container);

        this.container.position.set(0, 0, 0);

        this.InitPhisic();
        const input = new PlayerInput();
        this.input = input;
        const speed = 5;
        const rotationSpeed = 25; // high slerp factor for near-instant directional response
        const acceleration = 20;
        const deceleration = 40;
        const stopDeceleration = 10; // smooth glide-to-stop when joystick is released
        this.movement = new MoveC(this.input, speed, acceleration, deceleration);
        this.rotation = new RotationC(this.container, this.input, rotationSpeed, true);

        this.InitStateMachine();
        this.initInventory();
        this.InitDetectionRing();

        this.updateDelegate = new Delegate<number>((delta) => this.Update(delta)); // прив'язуємо оновлення гравця до загального оновлення гри
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate); // додаємо наш метод оновлення до контролера оновлення, щоб він викликався кожного кадру
        this.wearUnarmed();
        FollowCameraC.Init(this.container); // ініціалізуємо камеру, щоб вона слідувала за гравцем
    }

    private static InitDetectionRing() {
        const geo = new THREE.RingGeometry(6.0, 6.1, 48, 1, 0, Math.PI * 2);
        const mat = new THREE.MeshBasicMaterial({
            color: 'green',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,

        });
        this._detectionRing = new THREE.Mesh(geo, mat);
        this._detectionRing.rotation.x = -Math.PI / 2;
        this._detectionRing.position.y = 0.05;
        this._detectionRing.visible = false;
        this.container.add(this._detectionRing);
    }

    private static InitStateMachine() {
        this._idleState   = new IdleState(this.character);
        this._runState    = new RunState(this.character, () => this.movement.Weight);
        this._lootState   = new LootState(this.character, this.rotation);
        this._attackState = new AttackState(
            this.character,
            this.rotation,
            this.container,
            () => this.movement.Direction,
            () => Player.dealAttackDamage(),
            // (freeze) => { Player._isShootingFreeze = freeze; },
        );

        this._stateMachine = new StateMachine();

        // AttackState and LootState are mutually exclusive: attack takes priority via IsAttacking flag.
        // LootState can escalate to AttackState (NPC enters while looting), but not the reverse.
        this._stateMachine.setTransitionTable(new Map<IState, IState[]>([
            [this._idleState,   [this._runState, this._lootState, this._attackState]],
            [this._runState,    [this._idleState, this._lootState, this._attackState]],
            [this._lootState,   [this._idleState, this._runState, this._attackState]],
            [this._attackState, [this._idleState, this._runState]],
        ]));

        this._stateMachine.changeState(this._idleState);
    }

    private static initInventory() {
        this.inventory = new ResourseSystem();
        HudC.init(this.inventory);
        ZombieProgressBarC.init();
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

        body.angularFactor.set(0, 0, 0);
        body.linearDamping = 0.9;
        body.sleepSpeedLimit = 0;  
    }

    private static UpdateMovementState(dir: THREE.Vector3) {
        const isStopped = dir.length() < 0.01;
        const sm = this._stateMachine;

        if (this.IsAttacking) {
            const targetPos = TriggerSystem.getNearestActivePosition("npc");
            const inRange = !!targetPos && this.container.position.distanceTo(targetPos) <= AttackState.ATTACK_RADIUS;
            if (!inRange) {
                this.IsAttacking = false;
            } else {
                if (sm.currentState !== this._attackState) {
                    sm.changeState(this._attackState);
                }
                return;
            }
        }

        // Lock movement as soon as the player enters a loot zone so the character
        // decelerates naturally, then transition to LootState once fully stopped.
        // this.movement.isLocked = this.IsLooting;

        if (this.IsLooting && isStopped) {
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

    private static UpdateDetectionRing(delta: number) {
        const npcInRange = TriggerSystem.hasAnyActiveTrigger("npc");
        this._detectionRing.visible = npcInRange;
        if (npcInRange) {
            this._detectionRingTime += delta;
            const pulse = 1 + 0.1 * Math.sin(this._detectionRingTime * 6);
            this._detectionRing.scale.set(pulse, pulse, pulse);
        }
    }

    private static Update(delta: number) {
        const dir = this.movement.Direction;

        this.UpdateMovementState(dir);
        this._stateMachine.update(delta);
        this.UpdateDetectionRing(delta);

        // While a one-shot PistolShoot is playing, zero out the physics velocity so
        // the character doesn't slide. MoveC keeps tracking the joystick the whole
        // time, so movement resumes instantly and at full speed the moment the shot ends.
        const velDir = this._isShootingFreeze ? new THREE.Vector3() : dir;
        this.physics.getPhysicsBody().velocity.copy(Vector3TToC(velDir));
        this.MoveVisual(delta);
    }

    private static MoveVisual(delta: number) {
        const lerpSpeed = 20;
        const targetPos = (Vector3CToT(this.physics.getPhysicsBody().position));

        this.container.position.lerp(targetPos, delta * lerpSpeed)
    }

    /** Deals 1 point of damage to the nearest NPC whose trigger zone the player is inside. */
    private static dealAttackDamage(): void
    {
        const trigger = TriggerSystem.getNearestActiveTrigger("npc");
        const npc = trigger?.data as { takeDamage: (amount: number) => void } | null;
        // npc?.takeDamage(1);
    }

    private static wearWeapon() {
        this.character.setPartVisible("Weapon_Hand", true);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", false);
    }

    private static wearPistol() {
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", true);
        this.character.setPartVisible("Weapon_Back", true);
    }

    private static wearUnarmed() {
        this.character.setPartVisible("Weapon_Hand", false);
        this.character.setPartVisible("Character_Pistol", false);
        this.character.setPartVisible("Weapon_Back", true);
    }
}

