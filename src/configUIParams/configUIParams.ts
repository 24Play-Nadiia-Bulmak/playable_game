import { ConfigUiParamsCategories } from "@24tools/ads_common";
import { sounds } from "./sounds";
//@ts-ignore
import { analytics } from "./analytics";
//@ts-ignore
import { installBanner } from "./installBanner";
import { globalSettings } from "./globalSettings";

export const configUIParams: ConfigUiParamsCategories[][] = [
  analytics,
  installBanner,
  globalSettings,
  sounds,
];
