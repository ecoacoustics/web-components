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
      { keys: ["Ctrl"], description: "Toggle selection", hasMouse: true },
      { keys: ["Shift"], description: "Exclusive range selection" },
      { keys: ["Ctrl", "Shift"], description: "Additive range selection" },
      { keys: ["Ctrl", "a"], description: "Select all" },
      { keys: ["Esc"], description: "Deselect all" },
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
                    <td>${keyboardTemplate({ keys: shortcut.keys })}</td>
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
