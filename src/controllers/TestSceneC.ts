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
    ThreeC.addToScene(mapMesh);

    mapMesh.traverse((child: any) => {
      if (child.isMesh && child.name.startsWith("Wooden_Box_mesh")) {
        const boxPhysics = new PhysicsBody(
          child,
          false,  // не тригер — реальна стіна
          0,      // маса 0 = статичний об'єкт
          PhysicsLayer.Wall,
          PhysicsLayer.Player,
        );
        (boxPhysics.getPhysicsBody() as any).userData = { name: child.name };
        addBoundingBoxHelper(child, 0xff0000);
      }
    });
  }

  private static InitPlayer() {
    Player.Init();
  }
}
