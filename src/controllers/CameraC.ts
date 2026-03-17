import { CameraC_internal, Helper, Template } from "@24tools/playable_template";
import { PerspectiveCamera } from "three";

export class CameraC extends CameraC_internal {
  static setCamera(portraitOrientation: boolean) {
    const CATEGORY = Template.getCategory("global");
    if (this.camera !== null) {
      let position = portraitOrientation
        ? Helper.returnVectorCamera(CATEGORY["camera_position_p"] as number[])
        : Helper.returnVectorCamera(CATEGORY["camera_position_l"] as number[]);
      const rotation = portraitOrientation
        ? Helper.returnEulerCamera(CATEGORY["camera_rotation_p"] as number[])
        : Helper.returnEulerCamera(CATEGORY["camera_rotation_l"] as number[]);
      this.camera.rotation.x = rotation.x;
      this.camera.rotation.y = rotation.y;
      this.camera.rotation.z = rotation.z;
      this.camera.position.copy(position.clone());
      if (this.camera instanceof PerspectiveCamera) {
        this.camera.fov = portraitOrientation
          ? Number(CATEGORY["camera_fov_p"])
          : Number(CATEGORY["camera_fov_l"]);
        this.camera.updateProjectionMatrix();
      }
    }
  }
}
