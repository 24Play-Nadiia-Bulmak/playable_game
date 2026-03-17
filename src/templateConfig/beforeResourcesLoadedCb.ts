import { FilterScene, InstallBanner } from "@24tools/playable_template";

export const beforeResourcesLoadedCb: (() => void) | undefined = () => {
  FilterScene.init()
  InstallBanner.init();
};
