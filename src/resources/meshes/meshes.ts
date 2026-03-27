import { ConvertToBase64WhenRelease } from "@24tools/ads_common";
import { ConvertResourceType, Template3d } from "@24tools/playable_template";


export const meshes : ConvertResourceType = {
  type: "mesh",
  resources: [
    {
      name: "character",
      value: ConvertToBase64WhenRelease('./models/ZombiePunk_Character.glb'),
    },
        {
      name: "npc",
      value: ConvertToBase64WhenRelease('./models/npc.glb'),
    },
    {
      name: "map",
      value: ConvertToBase64WhenRelease('./models/scene.glb'),
    },
    {
      name: "progress_bar",
      value: ConvertToBase64WhenRelease('./models/progress_bar_new.glb'),
    },
    {
      name: "wood_particle",
      value: ConvertToBase64WhenRelease('./models/particle_1.glb'),
    },
  ],
  loader: Template3d.meshLoader
}