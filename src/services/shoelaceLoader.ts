import { registerIconLibrary } from "@shoelace-style/shoelace";
import circleHalfIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/circle-half.svg?raw";
import playIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/play.svg?raw";
import pauseIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/pause.svg?raw";
import paletteIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/palette.svg?raw";
import gearIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/gear.svg?raw";
import brightnessHighIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/brightness-high.svg?raw";
import questionCircleIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/question-circle.svg?raw";
import fullscreenExitIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/fullscreen-exit.svg?raw";
import arrowsFullscreenIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/arrows-fullscreen.svg?raw";
import gridIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/grid.svg?raw";
import slidersIcon from "../../node_modules/@shoelace-style/shoelace/dist/assets/icons/sliders.svg?raw";

type InlineSvg = `data:image/svg+xml,${string}`;

// to use an icon inside <sl-icon>, you will need to register the icon below
// if icon is not registered, the <sl-icon> will not have any content
const registeredIcons: Record<string, string> = {
  "circle-half": circleHalfIcon,
  "brightness-high": brightnessHighIcon,
  "question-circle": questionCircleIcon,
  "fullscreen-exit": fullscreenExitIcon,
  "arrows-fullscreen": arrowsFullscreenIcon,
  play: playIcon,
  pause: pauseIcon,
  palette: paletteIcon,
  gear: gearIcon,
  grid: gridIcon,
  sliders: slidersIcon,
};

export function registerBundledIcons() {
  registerIconLibrary("default", {
    resolver: (name: keyof typeof registeredIcons): InlineSvg => inlineSvg(registeredIcons[name]),
  });
}

function inlineSvg(source: string): InlineSvg {
  return `data:image/svg+xml,${source}`;
}
