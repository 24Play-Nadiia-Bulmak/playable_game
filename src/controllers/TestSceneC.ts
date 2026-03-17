import { BoxGeometry, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { ThreeC } from "./ThreeC";
import { InputC, JoystickC } from "@24tools/playable_template";

export class TestSceneC {
  static init() {
    this.createPrimitive();

    // example of using InputC events
    InputC.onTouchDown.addDelegate((event) => {
      console.log("onMouseDown", event);
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
    ThreeC.addToScene(plane);
  }
}
