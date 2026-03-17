import type { ConvertResourcesType, RedirectOptions, screenSize } from '@24tools/playable_template';
import { ConfigCreative } from '@24tools/ads_common';

declare global {
  interface Window extends Window {
    CustomizationRedirectCallback: any;
    registerRedirectCallback: (el: any) => void;
    updateVariableConfig: (
      category: string,
      variable: string,
      value: any
    ) => void;
    setupConfig: (config?: ConfigCreative) => void;
    soundConfig: (
      category: "setMute" | "getMute" | "setVolume" | "getVolume",
      value?: boolean | number
    ) => boolean | number | undefined;
    isStarted?: boolean;
    CONFIG: ConfigCreative;
    gameStart: () => void;
    gameClose: () => void;
    gameReady: () => void;
    gameEnd: () => void;
    screenSize: screenSize;
    showLoader: (state: boolean) => void;
    setRedirectOptions: (option: RedirectOptions | null) => void;
    openGameStorePage: (cb: () => void) => void;
    start: () => void
    mraid: any
    convertResources: ConvertResourcesType
    startTime:  number
    updateVideoState: (cbUpdate: (state: "play" | "pause") => void) => void;
    updateCurrentStep: (cbUpdate: (videoStep: VideoStep) => void) => void;
  }
}

export {};