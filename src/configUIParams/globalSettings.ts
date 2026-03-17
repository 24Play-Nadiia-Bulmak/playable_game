import { ConfigUiParamsCategories } from "@24tools/ads_common";

export const globalSettings: ConfigUiParamsCategories[] = [
  {
    id: "global",
    name: "Scene settings",
    params: [
      {
        id: "light_intensity",
        name: "Light intensity",
        type: "float",
        values: [
          0,
          5,
          1
        ]
      },
      {
        id: "light_color",
        name: "Main light color",
        type: "color",
        values: [
          "0xFFFFFF"
        ]
      },
      {
        id: "camera_fov_p",
        name: "Camera FOV (portrait)",
        type: "int",
        values: [
          30,
          150,
          60
        ]
      },
      {
        id: "camera_position_p",
        name: "Camera position (portrait)",
        type: "float",
        array: true,
        visible: "position",
        values: [
          [
            -10,
            10,
            0
          ],
          [
            -10,
            10,
            1
          ],
          [
            -10,
            10,
            5
          ]
        ]
      },
      {
        id: "camera_rotation_p",
        name: "Camera rotation (portrait)",
        type: "int",
        array: true,
        visible: "position",
        values: [
          [
            -360,
            360,
            0
          ],
          [
            -360,
            360,
            0
          ],
          [
            -360,
            360,
            0
          ]
        ]
      },
      {
        id: "camera_fov_l",
        name: "Camera FOV (landscape)",
        type: "int",
        values: [
          30,
          150,
          60
        ]
      },
      {
        id: "camera_position_l",
        name: "Camera position (landscape)",
        type: "float",
        array: true,
        visible: "position",
        values: [
          [
            -10,
            10,
            0
          ],
          [
            -10,
            10,
            1
          ],
          [
            -10,
            10,
            5
          ]
        ]
      },
      {
        id: "camera_rotation_l",
        name: "Camera rotation (landscape)",
        type: "int",
        array: true,
        visible: "position",
        values: [
          [
            -360,
            360,
            0
          ],
          [
            -360,
            360,
            0
          ],
          [
            -360,
            360,
            0
          ]
        ]
      }
    ]
  }
]