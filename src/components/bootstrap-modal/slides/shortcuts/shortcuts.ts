import { html, svg, TemplateResult } from "lit";
import { map } from "lit/directives/map.js";
import { KeyboardShortcut } from "bootstrap-modal/bootstrap-modal";
import { AbstractSlide } from "../abstractSlide";
import { gridTileSprite, GridTileSpriteRefs } from "../../sprites/grid-tile.sprite";
import { loop } from "../../../../helpers/directives";
import { when } from "lit/directives/when.js";
import { createTimeline } from "../../../../helpers/animations/timeline";
import { createRef, ref, Ref } from "lit/directives/ref.js";

export class ShortcutsSlide extends AbstractSlide {
  public constructor(shortcuts: KeyboardShortcut[]) {
    super("You can use the following keyboard shortcuts");

    this.shortcuts = shortcuts;
  }

  private keyframeCount = 3 as const;
  private shortcuts: KeyboardShortcut[];
  private gridTileRefs = [
    { background: createRef<SVGRectElement>(), decisionMeter: createRef<SVGRectElement>() },
    { background: createRef<SVGRectElement>(), decisionMeter: createRef<SVGRectElement>() },
    { background: createRef<SVGRectElement>(), decisionMeter: createRef<SVGRectElement>() },
  ] satisfies GridTileSpriteRefs[];
  private kbdShortcutRefs = [
    createRef<HTMLDivElement>(),
    createRef<HTMLDivElement>(),
    createRef<HTMLDivElement>(),
    createRef<HTMLDivElement>(),
  ] satisfies Ref<HTMLDivElement>[];

  private verificationGrid() {
    return svg`
      ${gridTileSprite(10, 0, false, "tile-0", this.gridTileRefs[0])}
      ${gridTileSprite(100, 0, false, "tile-1", this.gridTileRefs[1])}
      ${gridTileSprite(190, 0, false, "tile-2", this.gridTileRefs[2])}
    `;
  }

  public override start(): void {
    for (const tileRefs of this.gridTileRefs) {
      const decisionMeter = tileRefs.decisionMeter?.value;
      const background = tileRefs.background?.value;

      createTimeline(decisionMeter, this.keyframeCount);
      createTimeline(background, this.keyframeCount);
    }

    for (const shortcutRef of this.kbdShortcutRefs) {
      const kbdShortcut = shortcutRef.value;

      createTimeline(kbdShortcut, this.keyframeCount);
    }
  }

  private keyboardButtonsTemplate(): TemplateResult {
    const displayedShortcuts = [
      ...this.shortcuts,
      { keys: ["Ctrl", "Click"], description: "" },
      { keys: ["Ctrl", "A"], description: "Select All" },
      { keys: ["Esc"], description: "De-select All" },
    ] satisfies KeyboardShortcut[];

    return html`
      ${map(
        displayedShortcuts,
        (shortcut: KeyboardShortcut, index: number) => html`
          <section class="shortcut-card">
            <h3 class="shortcut-card-title">${shortcut.description}</h3>
            <div class="shortcut shortcut-${index}" ${ref(this.kbdShortcutRefs[index])}>
              ${loop(shortcut.keys, (key, { last }) => html`<kbd>${key}</kbd> ${when(!last, () => "+")}`)}
            </div>
          </section>
        `,
      )}
    `;
  }

  public render() {
    return html`
      <div class="shortcut-slide slide">
        <div class="shortcut-card">
          <svg viewBox="0 0 270 60">${this.verificationGrid()}</svg>
          <div class="shortcut-keys">${this.keyboardButtonsTemplate()}</div>
        </div>
      </div>
    `;
  }
}
