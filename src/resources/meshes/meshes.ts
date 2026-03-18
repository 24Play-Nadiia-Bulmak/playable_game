import { ConvertToBase64WhenRelease } from "@24tools/ads_common";
import { ConvertResourceType, Template3d } from "@24tools/playable_template";


export const meshes : ConvertResourceType = {
  type: "mesh",
  resources: [
    {
      name: "character",
      value: ConvertToBase64WhenRelease('./models/ZombiePunk_Character.glb'), // ConvertToBase64WhenRelease!
    },
    {
      name: "map",
      value: ConvertToBase64WhenRelease('./models/scene.glb'), // with “resources/..” ???
    },
  ],
  loader: Template3d.meshLoader
}// get/set with ResourcesC.getResource<GLTF>("mesh", name)