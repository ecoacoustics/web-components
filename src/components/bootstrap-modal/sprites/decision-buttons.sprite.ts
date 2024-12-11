import { svg } from "lit";
import { SvgSprite } from "./types";
import { Tag } from "../../../models/tag";

export function decisionButtonsSprite(verifications: boolean, classifications: Tag[]): SvgSprite {
  return svg`<text x="100" y="100">${verifications} ${classifications}</text>`;
}
