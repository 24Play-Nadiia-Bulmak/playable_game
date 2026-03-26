import { ConvertResourcesType } from "@24tools/playable_template";
import { meshes } from "./meshes/meshes";
import { sounds } from "./sounds/sounds";
import { vfx } from "./vfx/vfx";
import { vfx_atlas } from "./atlasVfx/atlasVFX";

export const resources: ConvertResourcesType = [meshes, sounds, vfx, vfx_atlas];
