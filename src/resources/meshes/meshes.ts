// import { ConvertToBase64WhenRelease } from "@24tools/ads_common";
import { ConvertResourceType, Template3d } from "@24tools/playable_template";


export const meshes : ConvertResourceType = {
  type: "mesh",
  resources: [
    // {
    //   name: "scene",
    //   value: ConvertToBase64WhenRelease("./SceneСombo.glb"),
    // },
  ],
  loader: Template3d.meshLoader
}