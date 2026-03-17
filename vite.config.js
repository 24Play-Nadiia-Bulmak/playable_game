import { defineConfig } from "vite";
import { defineConfigTemplate} from "@24tools/ads_common";
import { dependencies } from "./package.json";

const rootDev = "src";
const rootBuild = "src";

export default defineConfig((config) => {
  return defineConfigTemplate({
    rootDev,
    rootBuild,
    config,
    dependenciesArr: Object.keys(dependencies),
  });
});
