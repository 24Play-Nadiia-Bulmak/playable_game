import {
  CameraC_internal,
  CameraType,
  Physics_internal,
  Template,
  Template3d,
  ThreeC_internal,
  FilterScene,
  InstallBanner,
  TweenC  
} from "@24tools/playable_template";
import { CameraC } from "../controllers/CameraC";
import { ThreeC } from "../controllers/ThreeC";
import { Color } from "three";
import { Vec3 } from "cannon-es";
import { PlayerInput } from "../controllers/Presets/Input/PlayerInput";
export const beforeResourcesLoadedCb = () => {
  FilterScene.init();
  InstallBanner.init();

  Template3d.init();
  CameraC_internal.init(CameraType.perspective);
  CameraC.setCamera(window.screenSize.portrait); 
  ThreeC_internal.init();
  ThreeC.createBaseLights();
  ThreeC.setupDirectionalLight();
  TweenC.init();

  let physicsWorld = Physics_internal.init(new Vec3(0, 0, 0));
  // gravitation - -9.81 for earth, -3.71 for mars, -1.62 for moon

  // example of using joystick. Uncomment if you need joystick

  //   JoystickC.init({
  //     zone: document.getElementById("joystick_zone") as HTMLDivElement,
  //     fadeTime: 0,
  //     mode: "dynamic",
  //     restJoystick: true,
  //     catchDistance: 1,
  //     restOpacity: 0,
  //     follow: false,
  //   });

  // JoystickC.onJoysticMove.addDelegate(({event, data}) => {
  //   console.log('onJoysticMove', event, data);
  // })

  Template.updateVariableConfig.addDelegate(([category, variable, value]) => { // ця функція буде викликатись при зміні будь-якої змінної в конфігу, в залежності від категорії та назви змінної можна виконувати якісь дії, наприклад змінювати параметри світла чи камери
    if (category === "global") {
      switch (variable) {
        case "light_intensity":
          ThreeC_internal.defaultAmbientLight.intensity = Number(value);
          break;

        case "light_color":
          ThreeC_internal.defaultAmbientLight.color = new Color(value as any);
          break;

        default:
          if (
            [
              "camera_fov_p",
              "camera_position_p",
              "camera_rotation_p",
              "camera_fov_l",
              "camera_position_l",
              "camera_rotation_l",
            ].includes(variable)
          ) {
            CameraC.setCamera(window.screenSize.portrait);
          }
          break;
      }
      return;
    }
  });

  PlayerInput.InitJoystick();
};
