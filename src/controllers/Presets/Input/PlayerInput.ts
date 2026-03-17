import { Delegate, JoystickC, UpdateController } from "@24tools/playable_template";
import { JoystickManagerOptions } from "nipplejs";
import { Vector3 } from "three";
import { IMoveInput } from "./MoveInput";
import { FollowCameraC } from "../Movment/CameraMovment/FollowCamera";

export class PlayerInput implements IMoveInput {


    public static InitJoystick() {
        const screenSize = window.screenSize;
        const minSize = Math.min(screenSize.width, screenSize.height);
        const joystickSizeAspect = 0.2;
        const fadeTime = 200;
        const options: JoystickManagerOptions = {
            zone: document.getElementById("joystick_zone") as HTMLElement,
            size: minSize * joystickSizeAspect,
            restJoystick: true,
            dynamicPage: true,
            catchDistance: minSize * joystickSizeAspect / 2,
            fadeTime: fadeTime,
        };
        JoystickC.init(options);

        JoystickC.onJoysticMove.addDelegate(({ event, data }) => {
            console.log('onJoysticMove', event, data);
        })
    }

    protected currentDirection: Vector3 = new Vector3();
    private updateDelegate: Delegate<number>;
    private StartDelegate: Delegate<any>;
    private MoveDelegate: Delegate<any>;
    private StopDelegate: Delegate<any>;
    private static threshold = 0.25;

    get CurrentDirection() { return this.currentDirection.clone(); };

    inputaActive: boolean = false;


    constructor() {
        this.updateDelegate = new Delegate<number>(this.update.bind(this));
        UpdateController.Instance.onUpdate.addListener(this.updateDelegate);

        this.MoveDelegate = new Delegate<any>(this.onTouchMove.bind(this));
        JoystickC.onJoysticMove.addListener(this.MoveDelegate);

        this.StopDelegate = new Delegate<any>(this.onTouchUp.bind(this));
        JoystickC.onJoysticEnd.addListener(this.StopDelegate);


        this.StartDelegate = new Delegate<any>(this.onTouchDown.bind(this));
        JoystickC.onJoysticDown.addListener(this.StartDelegate);
        JoystickC.onJoysticStart.addListener(this.StartDelegate);
    }

    update(delta: number) {

    }

    //@ts-ignore
    onTouchMove(event: EventDataWithJoyData) {
        this.currentDirection = this.GetDiraction(event);
        if (this.currentDirection.length() <= PlayerInput.threshold)
            this.currentDirection.multiplyScalar(0);
    }

    onTouchDown(event) {
        // console.log(event);

        if (this.inputaActive) return;
        this.inputaActive = true;
    }

    onTouchUp() {
        if (!this.inputaActive) return;
        this.inputaActive = false;
        this.currentDirection.multiplyScalar(0);
    }

    //@ts-ignore
    GetDiraction(event: EventDataWithJoyData) {
        const data = event.data
        const x = data.vector.x;
        const y = data.vector.y;
        const dir = new Vector3(-x, 0, y);
        dir.applyEuler(FollowCameraC.RotationCorection);

        return dir;
    }

}