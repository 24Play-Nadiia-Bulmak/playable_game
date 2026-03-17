import { ConfigUiParamsCategories } from "@24tools/ads_common";

export const sounds: ConfigUiParamsCategories[] = [
  {
    name: "Audio Settings",
    id: "sounds",
    params: [
      {
        id: "global_volume",
        name: "Global, %",
        type: "int",
        values: [0, 100, 80],
      },
      {
        id: "background_head",
        name: "Background",
        type: "group",
        params: [
          {
            id: "background_volume",
            name: "Background, %",
            type: "int",
            values: [0, 100, 50],
          },
          {
            id: "upload_background_music",
            name: "Upload background music",
            type: "upload_file",
            file_type: "sound",
          },
        ],
      },
    ],
  },
];
