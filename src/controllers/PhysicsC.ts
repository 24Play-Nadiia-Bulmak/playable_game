import {
  Delegate,
  Physics_internal,
  UpdateController,
} from "@24tools/playable_template";
import { Box3, Object3D, Vector3 } from "three";
import { PHYSICS } from './Presets/Constants/physics';
import { Body, Box, Quaternion, Sphere, Vec3 } from "cannon-es";
import { PhysicsLayer } from "./Presets/Enums/Physics";

export class PhysicsC
{
    static initFixedStep(): void
    {
        if (Physics_internal.delegateId)
        {
            UpdateController.Instance.onUpdate.removeListeners(Physics_internal.delegateId);
        }

        UpdateController.Instance.onUpdate.addDelegate((_delta) =>
        {
            try
            {
                Physics_internal.physicsWorld?.fixedStep(PHYSICS.FIXED_TIME_STEP, PHYSICS.MAX_SUB_STEPS);
            }
            catch (e) { }
        });
    }
}

export class PhysicsBody {
  private body: Body;
  private pair: PhysicsObjPair | null = null;

  constructor(
    threeObj: Object3D,
    trigger: boolean,
    mass: number,
    col_group: PhysicsLayer,
    col_mask: PhysicsLayer,
    player_sphere: number = 0.3,
    isKinematic: boolean = false
  ) {
    let isPlayer = col_group === PhysicsLayer.Player || col_group === PhysicsLayer.Npc;

    let oldQuaternion = threeObj.quaternion.clone();

    let nullQuaternion = new Quaternion();
    threeObj.quaternion.copy(nullQuaternion);

    let bbox = new Box3().setFromObject(threeObj);

    let size = new Vector3();
    bbox.getSize(size);

    threeObj.quaternion.copy(oldQuaternion);

    this.body = new Body({
      isTrigger: trigger,
      mass: mass,
      shape: isPlayer
        ? new Sphere(player_sphere)
        : new Box(new Vec3(size.x / 2, size.y / 2, size.z / 2)),
      collisionFilterGroup: col_group,
      collisionFilterMask: col_mask,
    });

    let worldPos = threeObj.getWorldPosition(new Vector3());

    this.body.position.set(worldPos.x, worldPos.y, worldPos.z);

    this.body.quaternion.setFromEuler(
      threeObj.rotation.x,
      threeObj.rotation.y,
      threeObj.rotation.z,
      "XYZ"
    );

    Physics_internal.physicsWorld &&
      Physics_internal.physicsWorld.addBody(this.body);

    if (isKinematic) {
      this.body.type = Body.KINEMATIC;
    }

    return this;
  }

  disablePhysicsPair() {
    if (this.pair) {
      this.pair.destroyed = true;
    }
  }

  getPhysicsBody() {
    return this.body;
  }

  removeFromWorld(): void
  {
    if (!Physics_internal.physicsWorld || !this.body) return;
    Physics_internal.physicsWorld.removeBody(this.body);
  }

  addToWorld(): void
  {
    if (!Physics_internal.physicsWorld || !this.body) return;
    Physics_internal.physicsWorld.addBody(this.body);
  }

  destroy() {
    if (!Physics_internal.physicsWorld) return;

    Physics_internal.physicsWorld.removeBody(this.body);

    (this.body as any) = null;
  }
}

export class PhysicsObjPair {
  threeObj: Object3D;
  physicsObj: Body;
  destroyed: boolean;
  delegateId: null | Delegate<number>;

  constructor(threeObj: Object3D, physicsObj: Body) {
    this.threeObj = threeObj;
    this.physicsObj = physicsObj;
    this.destroyed = false;

    this.delegateId = UpdateController.Instance.onUpdate.addDelegate(() => {
      this.update();
    });
  }

  update() {
    if (this.destroyed) return;

    if (this.threeObj && this.physicsObj) {
      this.threeObj.position.copy(this.physicsObj.position);
      this.threeObj.quaternion.copy(this.physicsObj.quaternion);
    }
  }
}
