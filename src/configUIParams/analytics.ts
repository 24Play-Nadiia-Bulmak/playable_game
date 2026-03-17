import { ConfigUiParamsCategories } from "@24tools/ads_common";

export const analytics: ConfigUiParamsCategories[] = [
  {
    name: "Analytics params",
    id: "analytics_params",
    params: [
      {
        id: "bite_brew",
        name: "Byte Brew",
        type: "group",
        params: [
          {
            name: "Enabled",
            id: "isAnalyticsBB_Enabled",
            type: "bool",
            values: [false],
          },
          {
            name: "App ID",
            id: "AnalyticsBB_AppID",
            type: "string",
            values: [""],
            uneditable: true,
            dontIncludeToLocalisation: true,
            disable: ["isAnalyticsBB_Enabled", "values !== true"],
          },
          {
            name: "Key",
            id: "AnalyticsBB_Key",
            type: "string",
            values: [""],
            uneditable: true,
            dontIncludeToLocalisation: true,
            disable: ["isAnalyticsBB_Enabled", "values !== true"],
          },
          {
            name: "version",
            id: "AppVersion",
            type: "string",
            values: ["1.0.0"],
            dontIncludeToLocalisation: true,
            disable: ["isAnalyticsBB_Enabled", "values !== true"],
            regExp: "^d+.d+.d+$",
          },
        ],
      },
    ],
  },
];
