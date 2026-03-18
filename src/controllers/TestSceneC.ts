import { BoxGeometry, Mesh, MeshStandardMaterial, PerspectiveCamera, Vector3 } from "three";
import { ThreeC } from "./ThreeC";
import { InputC, JoystickC, UpdateController } from "@24tools/playable_template";
import { CameraC } from "./CameraC";
import { Player } from "./Presets/Player";
import { PhysicsBody, PhysicsLayer } from "./PhysicsC";
import { addBoundingBoxHelper } from "./Presets/Helper";

export class TestSceneC {
  static init() {
    this.createMap();
    this.InitPlayer();
    // this.addPhysics();

    InputC.onTouchDown.addDelegate((event) => {
      // console.log("onMouseDown", event);
    });

    // if you have update in your controller
    // UpdateController.Instance.onUpdate.addDelegate(() => {
    //   this.update();
    // });
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
    addBoundingBoxHelper(mapMesh, 0x00ff00);
    ThreeC.addToScene(mapMesh);
  }

  private static addPhysics() {
    const mapMesh = ThreeC.getObject("map");
    const characterMesh = ThreeC.getObject("character");

    const mapPhysics = new PhysicsBody( 
      mapMesh,
      false,
      0,
      PhysicsLayer.Wall,
      PhysicsLayer.Player
    );

    const characterPhysics = new PhysicsBody(
      characterMesh,
      false,
      1,
      PhysicsLayer.Player,
      PhysicsLayer.Wall
    );

    characterPhysics.getPhysicsBody().addEventListener("collide", (e) => {
      if (e.body.collisionFilterGroup === PhysicsLayer.Trigger) {
        console.log("trigger entered");
      }
    });

    (mapPhysics.getPhysicsBody() as any).userData = { name: "map" }

    const boxes = []

    mapMesh.traverse((child: any) => {
      if (child.isMesh && child.name.startsWith("Wooden_Box_mesh")
        
      ) {
        boxes.push(child)
      }
    });

    console.log(boxes)

  }

  private static InitPlayer() {
    Player.Init();
  }
}
