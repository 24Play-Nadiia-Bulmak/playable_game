import { Template } from "@24tools/playable_template";

export const afterResourcesLoadedCb: (() => void) | undefined = () => {
  Template.disableLoader()
};
