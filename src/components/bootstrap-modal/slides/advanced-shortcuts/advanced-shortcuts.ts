import { html } from "lit";
import { AbstractSlide } from "../abstractSlide";
import { KeyboardShortcut, keyboardTemplate } from "../../../../templates/keyboard";

export class AdvancedShortcutsSlide extends AbstractSlide {
  public constructor() {
    super("Keyboard shortcuts");
  }

  public override hasAnimations = false;

  public render() {
    const keyboardShortcuts = [
      { keys: ["Space"], description: "Play selected spectrograms" },
      { keys: ["Alt"], description: "Keyboard selection" },
      { keys: ["f11"], description: "Fullscreen" },
      { keys: ["Ctrl", "a"], description: "Select all" },
      { keys: ["Esc"], description: "Deselect all" },
      { keys: ["Ctrl"], description: "Toggle selection", hasMouse: true },
      { keys: ["Shift"], description: "Exclusive range selection", hasMouse: true },
      { keys: ["Ctrl", "Shift"], description: "Additive range selection", hasMouse: true },
    ] satisfies KeyboardShortcut[];

    return html`
      <div class="advanced-shortcuts-slide slide">
        <div class="shortcuts-container">
          <table class="shortcuts-table">
            <tbody>
              ${keyboardShortcuts.map(
                (shortcut) => html`
                  <tr class="shortcut-row">
                    <td>${shortcut.description}</td>
                    <td>${keyboardTemplate(shortcut)}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
