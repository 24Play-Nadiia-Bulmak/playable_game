import { BoxGeometry, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Vector3 } from "three";
import { ThreeC } from "./ThreeC";
import { InputC, JoystickC, UpdateController } from "@24tools/playable_template";
import { CameraC } from "./CameraC";
import { Player } from "./Presets/Player";
import { PhysicsBody, PhysicsC, PhysicsLayer } from "./PhysicsC";
// import { addBoundingBoxHelper } from "./Presets/Helper";
import { Npc } from "./Presets/Npc";
import { TriggerSystem } from "./Presets/Trigger/TriggerSystem";
import { TriggerZone } from "./Presets/Trigger/TriggerZone";
import { Prop } from "./Presets/Prop/Prop";
import { SpawnManager, SpawnConfig } from "./Presets/ResourseSystem/SpawnManager";
import { PayZone } from "./Presets/PayZone/PayZone";
import { VfxSpawner } from "./Presets/Prop/VfxSpawner";

const WOOD_SPAWN_CONFIG: SpawnConfig = {
    resourceType: "wood",
    respawnDelay: 30,
    maxCount: 10,
};

export class TestSceneC {
  static init() {
    ThreeC.initParticleRenderer();
    TriggerSystem.init();
    SpawnManager.init();
    PhysicsC.initFixedStep();
    this.createMap();
    this.InitPlayer();
    this.createPayZone();
    this.initNpc(3);

    InputC.onTouchDown.addDelegate((event) => {
      // console.log("onMouseDown", event);
    });
  }

  private static createPrimitive() {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({ color: 0xcc0000 });
    const cube = new Mesh(geometry, material);
    cube.position.set(0, 0.5, 2);

    const geometryPlane = new BoxGeometry(5, 0.1, 7);
    const materialPlane = new MeshStandardMaterial({ color: 0xaaaaaa });
    const plane = new Mesh(geometryPlane, materialPlane);

    let planePosition = plane.position.clone();

    ThreeC.setShadowsStateForChildren(cube, true, false);

    ThreeC.setShadowsStateForChildren(plane, false, true);

    plane.position.copy(
      new Vector3(planePosition.x, planePosition.y - 0.5, planePosition.z - 1.5)
    );


    ThreeC.addToScene(cube);
    // ThreeC.addToScene(plane);
  }

  private static createMap() {
    const mapMesh = ThreeC.getObject("map");
    ThreeC.addToScene(mapMesh);

    // Group all sub-meshes of the same wooden box by their shared grandparent container.
    // Each mesh typically lives inside its own wrapper Object3D (BoxPart0/1/2), so
    // child.parent differs per mesh. Grouping by child.parent.parent (the common box root)
    // ensures all damage-state meshes of one box become a single Prop with N steps.
    const boxGroups = new Map<Object3D, { meshes: any[]; shadows: any[]; meshParents: Object3D[] }>();

    mapMesh.traverse((child: any) => {
      if (child.isMesh && child.name.includes("Wooden_Box_mesh_")) {
        // Use grandparent as the shared group key so all parts of one box are merged.
        const container: Object3D = child.parent?.parent ?? child.parent ?? mapMesh;
        if (!boxGroups.has(container)) {
          boxGroups.set(container, { meshes: [], shadows: [], meshParents: [] });
        }
        const group = boxGroups.get(container)!;
        group.meshes.push(child);
        group.meshParents.push(child.parent ?? container);
        const shadowMesh = child.parent?.getObjectByName(
          child.name.replace("_mesh_", "_shadow_")
        ) ?? null;
        if (shadowMesh) group.shadows.push(shadowMesh);
      }
    });

    for (const [_, { meshes, shadows, meshParents }] of boxGroups) {
      this.createWoodProp(meshes, shadows, meshParents);
      SpawnManager.trackSpawn("wood");
    }
  }

  /**
   * Creates a destructible wood Prop from the provided meshes, registers its trigger and
   * physics bodies, and schedules a respawn via SpawnManager when the prop is broken.
   *
   * @param meshes       Three.js mesh objects that form the visible prop (one per damage step).
   * @param shadows      Corresponding shadow meshes (if any), parallel array to meshes.
   * @param meshParents  Original scene parents for each mesh (BoxPart0/1/2). Used to restore
   *                     meshes to their correct place in the hierarchy on respawn.
   */
  private static createWoodProp(meshes: Object3D[], shadows: Object3D[], meshParents: Object3D[]): void {
    const physicsBodies = meshes.map((mesh: any) => {
      const body = new PhysicsBody(
        mesh,
        false,
        0,
        PhysicsLayer.Wall,
        PhysicsLayer.Player | PhysicsLayer.Npc,
      );
      (body.getPhysicsBody() as any).userData = { name: mesh.name, isCollider: true };
      // addBoundingBoxHelper(mesh, 0xff0000);
      return body;
    });

    const centerPos = meshes[0].getWorldPosition(new Vector3());
    const woodTrigger = new TriggerZone(centerPos, 1.3, "wood", false);
    TriggerSystem.addTrigger(woodTrigger);

    const prop = new Prop(meshes, physicsBodies, woodTrigger, shadows);
    woodTrigger.data = prop;

    woodTrigger.onEnter = () => {
      Player.IsLooting = true;
      prop.showBar();
    };
    woodTrigger.onExit = () => {
      if (!TriggerSystem.hasAnyActiveLootTrigger(["wood", "stone", "herb"])) {
        Player.IsLooting = false;
      }
      prop.hideBar();
    };

    prop.onBroken = () => {
      SpawnManager.trackDespawn("wood");
      SpawnManager.scheduleRespawn(WOOD_SPAWN_CONFIG, () => {
        // Restore each mesh and its shadow to their original wrapper Object3D.
        meshes.forEach((m, i) => meshParents[i].add(m));
        shadows.forEach((s, i) => meshParents[i].add(s));
        VfxSpawner.spawnSpawn(centerPos);
        TestSceneC.createWoodProp(meshes, shadows, meshParents);
      });
    };
  }

  private static InitPlayer() {
    Player.Init();
  }

  /**
   * Creates the pay-zone that the player must enter to spend collected resources.
   * Triggers the three-stage coin animation sequence once resources are delivered:
   * coins fly to the zone (task 64), then to the HUD (task 63), then the zone
   * shrinks and disappears (task 65).
   *
   * TODO: Adjust the spawn position to fit your map layout.
   */
  private static createPayZone(): void {
    
    const zone = new PayZone(new Vector3(Math.random() * 2 + 1, 0, Math.floor(Math.random() * 6 + 2)), 0.75);
    zone.onPaid = () =>
    {
        // Spawn a new pay zone at a fresh random position for the next level
        this.createPayZone();
        console.log('new zone created');
     };
  }

  private static initNpc(count: number = 1) {
    for (let i = 0; i < count; i++) {
      new Npc();
    }   
  }
}
