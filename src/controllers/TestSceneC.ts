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

const WOOD_SPAWN_CONFIG: SpawnConfig = {
    resourceType: "wood",
    respawnDelay: 30,
    maxCount: 10,
};

export class TestSceneC {
  static init() {
    TriggerSystem.init();
    SpawnManager.init();
    PhysicsC.initFixedStep();
    this.createMap();
    this.InitPlayer();
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

    // Group all sub-meshes of the same wooden box by their parent container
    const boxGroups = new Map<Object3D, { meshes: any[]; shadows: any[] }>();

    mapMesh.traverse((child: any) => {
      if (child.isMesh && child.name.includes("Wooden_Box_mesh_")) {
        const parent: Object3D = child.parent ?? mapMesh;
        if (!boxGroups.has(parent)) {
          boxGroups.set(parent, { meshes: [], shadows: [] });
        }
        const group = boxGroups.get(parent)!;
        group.meshes.push(child);
        const shadowMesh = child.parent?.getObjectByName(
          child.name.replace("_mesh_", "_shadow_")
        ) ?? null;
        if (shadowMesh) group.shadows.push(shadowMesh);
      }
    });

    for (const [parent, { meshes, shadows }] of boxGroups) {
      this.createWoodProp(meshes, shadows, parent);
      SpawnManager.trackSpawn("wood");
    }
  }

  /**
   * Creates a destructible wood Prop from the provided meshes, registers its trigger and
   * physics bodies, and schedules a respawn via SpawnManager when the prop is broken.
   *
   * @param meshes    Three.js mesh objects that form the visible prop.
   * @param shadows   Corresponding shadow meshes (if any).
   * @param parent    The scene parent to re-attach meshes to upon respawn.
   */
  private static createWoodProp(meshes: Object3D[], shadows: Object3D[], parent: Object3D): void {
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
    const woodTrigger = new TriggerZone(centerPos, 1.5, "wood", false);
    TriggerSystem.addTrigger(woodTrigger);

    const prop = new Prop(meshes, physicsBodies, woodTrigger, shadows);
    woodTrigger.data = prop;

    woodTrigger.onEnter = () => {
      Player.IsLooting = true;
      // prop.showBar();
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
        // Re-attach meshes to their original scene parent before re-creating the prop
        meshes.forEach(m => parent.add(m));
        shadows.forEach(s => parent.add(s));
        TestSceneC.createWoodProp(meshes, shadows, parent);
      });
    };
  }

  private static InitPlayer() {
    Player.Init();
  }

  private static initNpc(count: number = 1) {
    for (let i = 0; i < count; i++) {
      new Npc();
    }   
  }
}
