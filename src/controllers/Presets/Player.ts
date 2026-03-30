import { Delegate, ResourcesC, UpdateController } from "@24tools/playable_template";
import { Character } from "./Character/Character";
import { ResourcesType } from "./Enums/ResourcesType";
import { MeshType } from "./Enums/MeshType";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { BaseAnimation } from "./Enums/BaseAnimation";
import { PhysicsBody } from "../PhysicsC";
import { Object3D } from "three";
import { ThreeC } from "../ThreeC";
import { PlayerInput } from "./Input/PlayerInput";
import { MoveC } from "./Movement/MoveC";
import { Vector3CToT, Vector3TToC } from "./Utils/Helper";
import { RotationC } from "./Movement/RotationC";
import { FollowCameraC } from "./Movement/CameraMovement/FollowCamera";
import * as THREE from 'three';
import { StateMachine } from "./StateMachine/StateMachine";
import { IdleState } from "./StateMachine/IdleState";
import { RunState } from "./StateMachine/RunState";
import { LootState } from "./StateMachine/LootState";
import { AttackState } from "./StateMachine/AttackState";
import { ResourceSystem } from "./ResourceSystem/ResourceSystem";
import { TriggerSystem } from "./Trigger/TriggerSystem";
import { HudC } from "./UI/HudC";
import { ZombieProgressBarC } from "./UI/ZombieProgressBarC";
import { PLAYER } from './Constants/player';
import { PHYSICS } from './Constants/physics';
import { ATTACK } from './Constants/attacks';
import { MOVEMENT } from './Constants/movement';
import { IState } from "./Interfaces/stateMachine";
import { WeaponType } from "./Enums/WeaponType";
import { PhysicsLayer } from "./Enums/Physics";

 
export class Player {
    private static inited: boolean = false;
    static IsAttacking: boolean = false;
    static IsLooting: boolean = false;

    static inventory: ResourceSystem;

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

    static get direction() {
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
        this.character.playAnimation(BaseAnimation.Idle)
        this.container.add(this.character.tObj); 
        ThreeC.addToScene(this.container);

        this.container.position.set(2, 0, 3);

        this.InitPhysics();
        const input = new PlayerInput();
        this.input = input;
        const speed = PLAYER.SPEED;
        const rotationSpeed = PLAYER.ROTATION_SPEED;
        const acceleration = PLAYER.ACCELERATION;
        const deceleration = PLAYER.DECELERATION;
        const stopDeceleration = 10;
        this.movement = new MoveC(this.input, speed, acceleration, deceleration);
        this.rotation = new RotationC(this.container, this.input, rotationSpeed, true);

        this.InitStateMachine();
        this.initInventory();
        this.InitDetectionRing();

        this.updateDelegate = new Delegate<number>((delta) => this.Update(delta));
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate);
        this.wearUnarmed();
        FollowCameraC.Init(this.container);
    }

    private static InitDetectionRing() {
        const geo = new THREE.RingGeometry(PLAYER.DETECTION_RING_INNER_RADIUS, PLAYER.DETECTION_RING_OUTER_RADIUS, PLAYER.DETECTION_RING_SEGMENTS, 1, 0, Math.PI * 2);
        const mat = new THREE.MeshBasicMaterial({
            color: 'green',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: PLAYER.DETECTION_RING_OPACITY,

        });
        this._detectionRing = new THREE.Mesh(geo, mat);
        this._detectionRing.rotation.x = -Math.PI / 2;
        this._detectionRing.position.y = PLAYER.DETECTION_RING_Y_OFFSET;
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
        );

        this._stateMachine = new StateMachine();

        this._stateMachine.setTransitionTable(new Map<IState, IState[]>([
            [this._idleState,   [this._runState, this._lootState, this._attackState]],
            [this._runState,    [this._idleState, this._lootState, this._attackState]],
            [this._lootState,   [this._idleState, this._runState, this._attackState]],
            [this._attackState, [this._idleState, this._runState, this._lootState]],
        ]));

        this._stateMachine.changeState(this._idleState);
    }

    private static initInventory() {
        this.inventory = new ResourceSystem();
        HudC.init(this.inventory);
        ZombieProgressBarC.init();
    }

    private static InitPhysics() {
        this.physics = new PhysicsBody(
            this.container,
            false,
            1,
            PhysicsLayer.Player,
            PhysicsLayer.Wall | PhysicsLayer.Npc,
        );
        const body = this.physics.getPhysicsBody();

        body.angularFactor.set(0, 0, 0);
        body.linearDamping = PHYSICS.LINEAR_DAMPING;
        body.sleepSpeedLimit = PHYSICS.SLEEP_SPEED_LIMIT;  
    }

    private static UpdateMovementState(dir: THREE.Vector3) {
        const isStopped = dir.length() < MOVEMENT.NEAR_ZERO_THRESHOLD;
        const sm = this._stateMachine;

        if (this.IsAttacking) {
            const targetPos = TriggerSystem.getNearestActivePosition("npc");
            const inRange = !!targetPos && this.container.position.distanceTo(targetPos) <= ATTACK.RADIUS;
            if (!inRange) {
                this.IsAttacking = false;
            } else {
                if (sm.currentState !== this._attackState) {
                    sm.changeState(this._attackState);
                }
                return;
            }
        }

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

    private static UpdateDetectionRing(delta: number) {
        const npcInRange = TriggerSystem.hasAnyActiveTrigger("npc");
        this._detectionRing.visible = npcInRange;
        if (npcInRange) {
            this._detectionRingTime += delta;
            const pulse = 1 + PLAYER.DETECTION_RING_PULSE_AMPLITUDE * Math.sin(this._detectionRingTime * PLAYER.DETECTION_RING_PULSE_FREQUENCY);
            this._detectionRing.scale.set(pulse, pulse, pulse);
        }
    }

    private static Update(delta: number) {
        const dir = this.movement.Direction;

        this.UpdateMovementState(dir);
        this._stateMachine.update(delta);
        this.UpdateDetectionRing(delta);

        const velDir = this._isShootingFreeze ? new THREE.Vector3() : dir;
        this.physics.getPhysicsBody().velocity.copy(Vector3TToC(velDir));
        this.MoveVisual(delta);
    }

    private static MoveVisual(delta: number) {
        const lerpSpeed = PLAYER.VISUAL_LERP_SPEED;
        const targetPos = (Vector3CToT(this.physics.getPhysicsBody().position));

        this.container.position.lerp(targetPos, delta * lerpSpeed)
    }

    private static dealAttackDamage(): void
    {
        const trigger = TriggerSystem.getNearestActiveTrigger("npc");
        const npc = trigger?.data as { takeDamage: (amount: number) => void } | null;
        // npc?.takeDamage(1);
    }

    private static wearWeapon() {
        this.character.setWeaponLoadout(WeaponType.Melee);
    }

    private static wearPistol() {
        this.character.setWeaponLoadout(WeaponType.Pistol);
    }

    private static wearUnarmed() {
        this.character.setWeaponLoadout(WeaponType.Unarmed);
    }
}

