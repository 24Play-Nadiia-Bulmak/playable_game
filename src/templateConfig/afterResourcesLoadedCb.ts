import { TestSceneC } from "../controllers/TestSceneC";
import { SoundC, Template } from "@24tools/playable_template";

export const afterResourcesLoadedCb: (() => void) | undefined = () => {
  TestSceneC.init();
  SoundC.init();
  Template.disableLoader();
  // console.log(Template.getConfig());
  // console.log(Template.getValue("player_options", "player_color"));
};
