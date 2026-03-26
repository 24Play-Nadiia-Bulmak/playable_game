import { formConfigForPlayable, formConfigUI, formConfigUIParams, TemplateType } from "@24tools/ads_common";
import { resources } from "./resources/resources";
import { resizeCb } from "./templateConfig/resizeCb";
import { gameRedirectedCb } from "./templateConfig/gameRedirectedCb";
import { playableIsVisibleCb } from "./templateConfig/playableIsVisibleCb";
import { beforeResourcesLoadedCb } from "./templateConfig/beforeResourcesLoadedCb";
import { afterResourcesLoadedCb } from "./templateConfig/afterResourcesLoadedCb";
import { customFont } from "./fonts/customFont";
import { configUIParams } from "./configUIParams/configUIParams";
import { Template, Template3d } from "@24tools/playable_template";
import { firstClickCb } from "./templateConfig/firstClickCb";

Template.set24ADSControls();
window.setupConfig = async function (config) {
  Template.initConfig({
    templateType: TemplateType["3d"],
    redirectOptions: {    
      tapRedirect: 1,
      timeRedirect: 5000
    },
    ticker: Template3d.ticker,
    debug: {
      debug: false, // set true if you want to enable debug mode
      physics: true,
      // set true if you want to enable physics debugger
      logger: true, // set true if you want to enable logger
      //  fps_limitter: 30, // set fps limitter (number) or false to disable it
      fps_counter: false // set true if you want to enable fps counter
    }}).init({
    config: config || formConfigForPlayable(formConfigUI({
      type_default: Template.templateType,
      params_categories: formConfigUIParams(...configUIParams),
      font_custom_default: await customFont
    })),
    resources,
    afterResourcesLoadedCb,
    beforeResourcesLoadedCb,
    resizeCb,
    playableIsVisibleCb,
    gameRedirectedCb,
    firstClickCb
  });

};
