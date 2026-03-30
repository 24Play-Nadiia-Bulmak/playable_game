import { BoxGeometry, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { ThreeC } from "./ThreeC";
import { InputC } from "@24tools/playable_template";
import { Player } from "./Presets/Player";
import { PhysicsBody, PhysicsC } from "./PhysicsC";
import { Npc } from "./Presets/Npc";
import { TriggerSystem } from "./Presets/Trigger/TriggerSystem";
import { TriggerZone } from "./Presets/Trigger/TriggerZone";
import { LootProp } from "./Presets/LootProp/LootProp";
import { SpawnManager } from "./Presets/Spawner/SpawnManager";
import { PayZone } from "./Presets/PayZone/PayZone";
import { VfxSpawner } from "./Presets/Spawner/VfxSpawner";
import { PhysicsLayer } from "./Presets/Enums/Physics";
import { WOOD_SPAWN_CONFIG } from "./Presets/Constants/woodSpawn";

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

  private static createMap() {
    const mapMesh = ThreeC.getObject("map");
    ThreeC.addToScene(mapMesh);

    const boxGroups = new Map<Object3D, { meshes: any[]; shadows: any[]; meshParents: Object3D[] }>();

    mapMesh.traverse((child: any) => {
      if (child.isMesh && child.name.includes("Wooden_Box_mesh_")) {
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

    for (const [container, { meshes, shadows, meshParents }] of boxGroups) {
      const uiMesh = container.getObjectByName("UI") ?? null;
      this.createWoodProp(meshes, shadows, meshParents, uiMesh);
      SpawnManager.trackSpawn("wood");
    }
  }

  private static createWoodProp(meshes: Object3D[], shadows: Object3D[], meshParents: Object3D[], uiMesh: Object3D | null = null): void {
    const physicsBodies = meshes.map((mesh: any) => {
      const body = new PhysicsBody(
        mesh,
        false,
        0,
        PhysicsLayer.Wall,
        PhysicsLayer.Player | PhysicsLayer.Npc,
      );
      (body.getPhysicsBody() as any).userData = { name: mesh.name, isCollider: true };
      return body;
    });

    const centerPos = meshes[0].getWorldPosition(new Vector3());
    const woodTrigger = new TriggerZone(centerPos, 1.5, "wood", false);
    TriggerSystem.addTrigger(woodTrigger);

    const prop = new LootProp(meshes, physicsBodies, woodTrigger, shadows, 3);
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

  private static createPayZone(): void {
    new PayZone(0.75);
  }

  private static initNpc(count: number = 1) {
    for (let i = 0; i < count; i++) {
      new Npc();
    }   
  }
}
