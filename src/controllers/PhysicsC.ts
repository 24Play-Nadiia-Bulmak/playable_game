import {
  Delegate,
  Physics_internal,
  UpdateController,
} from "@24tools/playable_template";
import { Box3, Object3D, Vector3 } from "three";
import { Body, Box, Quaternion, Sphere, Vec3 } from "cannon-es";

/** Configures cannon-es world to use a fixed 1/60 timestep with at most 3 sub-steps per frame. */
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
                // cannon-es fixedStep tracks elapsed time internally;
                // we only override dt and maxSubSteps.
                Physics_internal.physicsWorld?.fixedStep(1 / 60, 3);
            }
            catch (e) { }
        });
    }
}

export enum PhysicsLayer {
  Player = 1,
  Npc = 2,
  Wall = 4,
  Trigger = 8,
  Enemy = 16,
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
    let isPlayer = col_group === PhysicsLayer.Player || col_group === PhysicsLayer.Npc; // для гравця сфера, для інших об'єктів коробка, але це можна змінити під свої потреби

    let oldQuaternion = threeObj.quaternion.clone(); // для правильного розміру колізії, бо модель може бути повернута, а фізичне тіло має бути вирівняне по осях

    let nullQuaternion = new Quaternion(); // нульовий кватерніон для отримання розміру об'єкта без урахування повороту
    threeObj.quaternion.copy(nullQuaternion); // тимчасово встановлюємо нульовий кватерніон для отримання правильного розміру об'єкта

    let bbox = new Box3().setFromObject(threeObj); // розмір моделі для фізики

    let size = new Vector3();
    bbox.getSize(size);

    // if you need custom size
    // if (col_group === PhysicsLayer.wall) {
    //   size.x = size.z = 1;
    //   size.y = 1;
    // }

    threeObj.quaternion.copy(oldQuaternion); // повертаємо оригінальний кватерніон назад

    this.body = new Body({
      isTrigger: trigger, // чи є це тригером (не фізичною перешкодою, а об'єктом для виявлення колізій)
      mass: mass,
      //shape: shape,
      shape: isPlayer
        ? new Sphere(player_sphere)
        : new Box(new Vec3(size.x / 2, size.y / 2, size.z / 2)),
      collisionFilterGroup: col_group,  // налаштування групи колізії
      collisionFilterMask: col_mask,  // налаштування маски колізії (з якими групами цей об'єкт буде взаємодіяти)
    });

    let worldPos = threeObj.getWorldPosition(new Vector3());

    this.body.position.set(worldPos.x, worldPos.y, worldPos.z);

    this.body.quaternion.setFromEuler( // синхронізація повороту між three.js і cannon-es
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

    if (isKinematic) {
      this.body.type = Body.KINEMATIC; // рухається через velocity, але не отримує імпульсів від зіткнень
    }

    return this;
  }

  disablePhysicsPair() { // зупиняє синхронізацію між three.js і cannon-es, якщо вона була створена, наприклад для ворога
    if (this.pair) {
      this.pair.destroyed = true;
    }
  }

  getPhysicsBody() { // для отримання доступу до тіла фізики, якщо потрібно напряму взаємодіяти з ним
    return this.body;
  }

  /** Removes the body from the physics world but keeps the body reference alive so it can be re-added later via addToWorld(). */
  removeFromWorld(): void
  {
    if (!Physics_internal.physicsWorld || !this.body) return;
    Physics_internal.physicsWorld.removeBody(this.body);
  }

  /** Re-adds a previously removed body back into the physics world. */
  addToWorld(): void
  {
    if (!Physics_internal.physicsWorld || !this.body) return;
    Physics_internal.physicsWorld.addBody(this.body);
  }

  destroy() { // видаляє тіло з фізики і зупиняє синхронізацію, якщо вона була створена
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

    this.delegateId = UpdateController.Instance.onUpdate.addDelegate(() => { // синхронізація позиції і повороту між three.js і cannon-es кожного кадру
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
