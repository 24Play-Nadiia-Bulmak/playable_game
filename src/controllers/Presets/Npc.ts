import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { MeshType } from "./Enums/MeshType";
import { ResourcesType } from "./Enums/ResourcesType";
import { Delegate, ResourcesC, UpdateController } from "@24tools/playable_template";
import { Object3D } from "three";
import { NpcInput } from "./Input/NpcInput";
import { Character } from "./Character/Character";
import { MoveC } from "./Movment/MoveC";
import { RotationC } from "./Movment/RotationC";
import { PhysicsBody, PhysicsLayer } from "../PhysicsC";
import { ThreeC } from "../ThreeC";
import { Vector3CToT, Vector3TToC } from "./Helper";
import { NpcMovementState } from "./Enums/MovementState";
import * as THREE from 'three';
import { NpcAnimation } from "./Enums/NpcAnimation";
import { TriggerZone } from "./Trigger/TriggerZone";
import { TriggerSystem } from "./Trigger/TriggerSystem";
import { Player } from "./Player";

 export class Npc {
     private container: Object3D = new Object3D;
     
     private movementState: NpcMovementState = NpcMovementState.Idle;
     private updateDelegate: Delegate<number>;
     private input: NpcInput;
     private movement: MoveC;
     private rotation: RotationC;
     
     private character: Character;
     private physics!: PhysicsBody;
     private triggerZone!: TriggerZone;

     private _hp: number = 5;
     private _dead: boolean = false;

     get Position() {
         return this.container.position;      
     }  

     get diraction() {
         return this.movement.Direction;
     }

     constructor() {
         const asset = ResourcesC.getResource<GLTF>(ResourcesType.Mesh, MeshType.Npc);
         this.character = new Character(asset);

         this.character.playAnimation(NpcAnimation.Idle);
         this.container.add(this.character.tObj);
         this.container.scale.set(0.5, 0.5, 0.5);
         ThreeC.addToScene(this.container);

         const pos = new THREE.Vector3(
             (Math.random() - 0.5) * 6,
             0,
             (Math.random() - 0.5) * 6
         );
         this.container.position.copy(pos);

         this.InitPhisic();

         const speed = 3;
         const acceleration = 2;
         this.input = new NpcInput();
         this.movement = new MoveC(this.input, speed, acceleration);
         this.rotation = new RotationC(this.container, this.input, speed, true);

         this.updateDelegate = new Delegate<number>((delta) => this.Update(delta));
         UpdateController.Instance.onUpdate.addListener(this.updateDelegate);

         this.triggerZone = new TriggerZone(
             this.container.position,
             6,
             "npc",
             false,
             this.container
         );

         this.triggerZone.onEnter = () => { Player.IsAttacking = true; };
         this.triggerZone.onExit  = () => { Player.IsAttacking = false; };
         this.triggerZone.data = this;
         TriggerSystem.addTrigger(this.triggerZone);
     }

            private InitPhisic() {
                this.physics = new PhysicsBody(
                    this.container,
                    false,
                    1,
                    PhysicsLayer.Npc,
                    PhysicsLayer.Wall | PhysicsLayer.Player,
                    0.3,   // sphere radius
                    true,  // kinematic — гравець відштовхується від NPC, але NPC не отримує імпульсів
                );

                const body = this.physics.getPhysicsBody();
                // body.userData = { name: "npc" };

                body.angularFactor.set(0, 0, 0);   // блокуємо обертання від зіткнень
                body.linearDamping = 0.9;          // затухання — персонаж не ковзає після зупинки
                body.sleepSpeedLimit = 0;       // body.sleepTimeLimit = 0.1; // NPC може заснути, якщо не рухається протягом 0.1 секунди
            }
        
            private UpdateMovementState(dir: THREE.Vector3, weight: number) {
                if (dir.length() < 0.01) {
                    this.SetState(NpcMovementState.Idle, weight);
                    return;
                }

                let state: NpcMovementState = NpcMovementState.Forward;
                this.SetState(state, weight);
            }
        
            private SetState(state: NpcMovementState, weight: number) {        
                if (state !== this.movementState) {
                    switch (state) {
                        case NpcMovementState.Idle:    this.character.playAnimation(NpcAnimation.Idle); break;
                        case NpcMovementState.Forward: this.character.playAnimation(NpcAnimation.Run); break;
                    }
                    this.movementState = state;
                }
        
                if (state !== NpcMovementState.Idle) {
                    this.AnimationValue = weight;
                }
            }

        private set AnimationValue(value: number) {
            this.character.AnimationSpeed = value;
            this.character.AnimationWeight = value * 12.5 + 87.5;
        }
    
        private Update(delta: number) {
            this.input.update(delta);
            const dir = this.movement.Direction;
            const weight = this.movement.Weight;

            this.UpdateMovementState(dir, weight);

            const cPos = Vector3TToC(dir);
            this.physics.getPhysicsBody().velocity.copy(cPos);
            this.MoveVisual(delta);
        }
    
        private MoveVisual(delta: number) {
            const lerpSpeed = 20;
            const targetPos = (Vector3CToT(this.physics.getPhysicsBody().position));
    
            this.container.position.lerp(targetPos, delta * lerpSpeed)
        }

        // takeDamage(amount: number): void
        // {
        //     if (this._dead) return;
        //     this._hp -= amount;
        //     if (this._hp <= 0) this._die();
        // }

        // private _die(): void
        // {
        //     this._dead = true;
        //     TriggerSystem.removeTrigger(this.triggerZone); // fires onExit → Player.IsAttacking = false
        //     this.container.removeFromParent();
        //     this.physics.destroy();
        //     UpdateController.Instance.onUpdate.removeListeners(this.updateDelegate);
        // }
}