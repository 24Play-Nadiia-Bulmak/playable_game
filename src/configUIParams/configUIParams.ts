import { ConfigUiParamsCategories } from "@24tools/ads_common";
import { sounds } from "./sounds";
import { analytics } from "./analytics";
import { installBanner } from "./installBanner";
import { globalSettings } from "./globalSettings";

export const configUIParams: ConfigUiParamsCategories[][] = [
  analytics,
  installBanner,
  globalSettings,
  sounds,
];
