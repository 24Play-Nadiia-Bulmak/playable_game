import { ConvertToBase64WhenRelease } from "@24tools/ads_common";
import { ConvertResourceType, quarksLoader } from "@24tools/playable_template";

export const vfx: ConvertResourceType = {
    type: "vfx_json",
    resources: [
        {
            name: "Test",
            value: ConvertToBase64WhenRelease("./Test.json"),
        },
        {
            name: "Destroy",
            value: ConvertToBase64WhenRelease("./VFX_Lootable_Destroy.json"),
        },

        {
            name: "Hit",
            value: ConvertToBase64WhenRelease("./VFX_Lootable_Hit.json"),
        },
    ],
    loader: quarksLoader,
};
