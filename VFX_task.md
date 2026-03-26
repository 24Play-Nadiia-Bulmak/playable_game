- For sprite atlas vfx recommended use of template class FXC
    
    ```jsx
    FXC.SpawnFX(<PPSITION>,<SPRITE_ATLASS>,<VFX_INFO>)
    ```

    - For sprite atlas vfx recommended use of template class FXC
    
    ```jsx
    FXC.SpawnFX(<PPSITION>,<SPRITE_ATLASS>,<VFX_INFO>)
    ```
    
- vfx Info
    
    ```yaml
    {
        frames_count_x: <horizontal_frames_count>,
        frames_count_y: <vertical_frames_count>,
        frames_count_total: 
        <horizontal_frames_count> * <vertical_frames_count> - <empty_frames_count>,
        scale: { x: <plane_x_scale>, y: <plane_y_scale> },
        interval: <frame_duration>,
        alpha: <alpha_value>,
        repeat: {
            x: 1 / <horizontal_frames_count>,
            y: 1 / <vertical_frames_count>,
        }
    },
    ```
    
- QuarcVFX system use VfxManager
    
    [VfxManager.ts](attachment:26389128-69bc-47a9-a346-eed9931a335e:VfxManager.ts)
    
    [Test.json](attachment:a1487a20-7a76-46b9-80b1-3692fe6b754d:Test.json)
    
    - to add VFX in resource add vfx_json in project
        
        ```
        import { ConvertToBase64WhenRelease } from "@24tools/ads_common";
        import { ConvertResourceType, Template3d } from "@24tools/playable_template";
        import { QuarksLoader } from "three.quarks";
        
        export const vfx_json: ConvertResourceType = {
          type: "vfx_json",
          resources: [
            {
              name: "Test",
              value: ConvertToBase64WhenRelease("resources/vfxJson/files/ColoringTesting/Cubes.json"),
            },
          ],
          loader: quarksLoader,
        }
        
        export function quarksLoader(base64String: string) {
          return new Promise((resolve, reject) => {
            try {
              new QuarksLoader(Template3d.manager).parse(
                JSON.parse(atob(base64String.split(",")[1])),
                (obj) => {
                  resolve({ obj });
                }
              );
            } catch (error) {
              reject("Error loading vfx: " + error);
            }
          });
        }
        ```
        
    - and add vfx_json in resources
    - to play VFX
        
        ```
        VfxManager.Play(<VFXName>, <Parent>, <Position>,<Scale>);



import { BatchedRenderer, QuarksLoader, QuarksUtil } from "three.quarks";
import { Object3D, Euler, Vector3 } from "three";
import { ResourcesC, UpdateController } from "@24tools/playable_template";
import { ThreeC } from "../../ThreeC";
import { TimeC } from "../Timers/TimeC";
import { VFXType } from "../Enums/VFXType";
import { ResourcesType } from "../Enums/ResourcesType";
import { vfxTest } from "./RunTimeTest";

export class VfxManager {
    static batchRenderer: BatchedRenderer;
    static loader: QuarksLoader;

    static Init() {
        this.batchRenderer = new BatchedRenderer();
        this.loader = new QuarksLoader();
        ThreeC.addToScene(this.batchRenderer);
        const updateDelegate = UpdateController.Instance.onUpdate.addDelegate(this.update.bind(this));
        // GameTimer.onDelayGameEnd.addDelegate(() => UpdateController.Instance.onUpdate.removeListeners(updateDelegate));
        // initTrailEffect();
    }

    static Remove(vfx: Object3D) {
        vfx.removeFromParent();
        vfx.parent = null;
    }

    static update(delta: number) {
        delta *= TimeC.TimeScale;
        this.batchRenderer.update(delta);
    }

    static Play(type: VFXType|string, parent: Object3D | null = null, position: Vector3 | null = null, rotation: Euler | null = null, scale: Vector3 | null = null, odred: number | null = null) {
        let loaded = (ResourcesC.getResource(ResourcesType.VFX, type.toString()) as { obj: any }).obj;
        if (!loaded) return new Object3D();
        // console.error("Type non loaded " + loaded);
        const effect = loaded.clone(true) as Object3D;
        QuarksUtil.setAutoDestroy(effect, true);
        QuarksUtil.addToBatchRenderer(effect, this.batchRenderer);

        if (parent) parent.add(effect)
        else ThreeC.addToScene(effect);
        if (position) effect.position.copy(position);
        if (rotation) effect.rotation.copy(rotation);
        if (scale) effect.scale.copy(scale);
        if (odred) effect.renderOrder = odred;

        return effect;
    }

    static StopEmision(effect: Object3D) {
        QuarksUtil.stop(effect);
    }
    static Restart(effect: Object3D) {
        QuarksUtil.play(effect);
    }
    static Pause(effect: Object3D) {
        QuarksUtil.pause(effect);
    }

}

        ```



        ### **What You Should Do:**

- Create simple **2D visual effects** using sprite atlases or tween-based animation
- Add VFX for:
    - **Collecting items**
    - **Player actions (e.g., attack or interaction)**
    - **Damage feedback**
    - **Spawn/despawn of game objects**
- Reuse or create **simple shaders, glow, scale-punch, alpha fades**, etc.
- Use **TweenJS** for scaling, movement, or fade transitions where relevant
- Make VFX **modular** and **triggered by events** in gameplay logic
- Keep performance in mind (avoid overdraw, keep VFX duration short)