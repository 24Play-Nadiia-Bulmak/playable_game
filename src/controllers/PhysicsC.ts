import {
  Delegate,
  Physics_internal,
  UpdateController,
} from "@24tools/playable_template";
import { Box3, Object3D, Vector3 } from "three";
import { Body, Box, Quaternion, Sphere, Vec3 } from "cannon-es";

export enum PhysicsLayer {
  Player = 1,
  Wall = 2,
  Trigger = 4,
  Enemy = 8,
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
    player_sphere: number = 0.3
  ) {
    let isPlayer = col_group === PhysicsLayer.Player;

    let oldQuaternion = threeObj.quaternion.clone();

    let nullQuaternion = new Quaternion();
    threeObj.quaternion.copy(nullQuaternion);

    let bbox = new Box3().setFromObject(threeObj);

    let size = new Vector3();
    bbox.getSize(size);

    // if you need custom size
    // if (col_group === PhysicsLayer.wall) {
    //   size.x = size.z = 1;
    //   size.y = 1;
    // }

    threeObj.quaternion.copy(oldQuaternion);

    this.body = new Body({
      isTrigger: trigger,
      mass: mass,
      //shape: shape,
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

    // if you need sync three obj and physics body
    // if (isEnemy) {
    //   let pair = new PhysicsObjPair(threeObj, this.body);
    //   PhysicsC_Instance.addPhysicsPair(pair);

    //   this.pair = pair;
    // }

    Physics_internal.physicsWorld &&
      Physics_internal.physicsWorld.addBody(this.body);

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
      // @ts-ignore
      this.threeObj.position.copy(this.physicsObj.position);
      // @ts-ignore
      this.threeObj.quaternion.copy(this.physicsObj.quaternion);
    }
  }
}
