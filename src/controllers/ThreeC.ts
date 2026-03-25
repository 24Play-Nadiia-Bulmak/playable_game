import { ColorFormat } from "@24tools/ads_common";
import { ThreeC_internal, Template, UpdateController } from "@24tools/playable_template";
import { AmbientLight, DirectionalLight } from "three";
import { Color } from "three/src/math/Color";
import { BatchedParticleRenderer } from "three.quarks";

export class ThreeC extends ThreeC_internal {
  static particleRenderer: InstanceType<typeof BatchedParticleRenderer>;

  /// <summary>
  /// Creates and registers the BatchedParticleRenderer used by all VFX in the scene.
  /// Must be called once during scene initialization, before any VfxSpawner.init() calls.
  /// </summary>
  static initParticleRenderer(): void {
    this.particleRenderer = new BatchedParticleRenderer();
    this.addToScene(this.particleRenderer);

    UpdateController.Instance.onUpdate.addDelegate((delta: number) => {
      this.particleRenderer.update(delta);
    });
  }

  static createBaseLights() {
    this.defaultDirectionalLight = new DirectionalLight(0xffffff, 3.5);
    this.defaultAmbientLight = new AmbientLight(0xffffff, 1);

    this.defaultAmbientLight.color = new Color().setHex(
      Number(Template.getValue<ColorFormat>("global", "light_color")) // бере з конфігу
    );
    this.defaultAmbientLight.intensity = 
      Template.getValue<number>("global", "light_intensity")
  }

  static setupDirectionalLightFromScene(dirLightObj:DirectionalLight) {
    if (!dirLightObj) return;

    ThreeC.removeFromScene(this.defaultDirectionalLight);

    let light = dirLightObj;

    let d = 15;
    light.shadow.camera.left = -10;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -2;

    light.castShadow = true;
    light.shadow.normalBias = 0.04;
    light.intensity = 1;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    const ambLight = new AmbientLight(0xffffff, 0.4); // soft white light
    this.addToScene(ambLight);
    this.addToScene(light);

    this.defaultDirectionalLight = light;
  }

  static setupDirectionalLight() {
    let dirLight = this.defaultDirectionalLight;

    dirLight.position.set(8, 10, 4); //default; light shining from top

    let d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;

    this.addToScene(dirLight);

    this.addToScene(this.defaultAmbientLight);
    this.addToScene(dirLight.target);

    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
  }
}
