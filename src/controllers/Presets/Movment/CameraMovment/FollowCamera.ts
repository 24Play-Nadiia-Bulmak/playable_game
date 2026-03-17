import { Delegate, Helper, Template, UpdateController } from "@24tools/playable_template";
import { Object3D, Vector3 } from "three";
import { ThreeC } from "../../../ThreeC";
import { CameraC } from "../../../CameraC";

export class FollowCameraC {
    private static updateDelegate: Delegate<number>;
    static target: Object3D;
    static offset: Vector3;

    static mainContainer: Object3D = new Object3D();
    static cameraContainer: Object3D = new Object3D();
    static cameraRotation: Object3D = new Object3D();

    static Init(target: Object3D) {
        this.target = target;
        this.offset = this.Offset;
        this.updateDelegate = new Delegate<number>(this.Update.bind(this));
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate);

        ThreeC.addToScene(this.mainContainer);
        this.mainContainer.add(this.cameraContainer);
        this.cameraContainer.add(this.cameraRotation);
        this.cameraRotation.add(CameraC.cameraContainer);

        this.cameraRotation.rotateY(Math.PI);

        this.mainContainer.position.copy(target.position);
        this.mainContainer.position.x += this.Offset.x;
        this.mainContainer.position.z += this.Offset.z;

        this.cameraContainer.position.y += this.Offset.y * 5;
    }

    private static Update(delta: number) {
        if (!this.target.position) return;

        const oldPos = this.mainContainer.position.clone();
        this.mainContainer.position.copy(this.target.position);
        this.mainContainer.position.x += this.Offset.x;
        this.mainContainer.position.z += this.Offset.z;
        const targetPos = this.mainContainer.position.clone();

        this.mainContainer.lookAt(this.target.position);
        this.cameraContainer.lookAt(this.target.position);


        const lerpSpeed = 10;
        this.mainContainer.position.lerpVectors(oldPos, targetPos, delta * lerpSpeed)

    }

    static get RotationCorection() {
        const rotation = this.mainContainer.rotation.clone();
        return rotation;
    }

    static get Offset() {
        const portrait = window.screenSize.portrait
        const values = portrait
            ? Template.getValue<number[]>("global", "camera_position_p")
            : Template.getValue<number[]>("global", "camera_position_l");
        const offset = Helper.returnVectorCamera(values);
        return offset
    }
}