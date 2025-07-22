import { html } from "lit";
import {
  KeyboardShortcut,
  keyboardShortcutTemplate,
  mouseClick,
  shiftSymbol,
} from "../../../../templates/keyboardShortcut";
import { BootstrapSlide } from "../bootstrapSlide";

export function advancedShortcutsSlide(): BootstrapSlide {
  const title = "Keyboard shortcuts";

  const keyboardShortcuts = [
    { keys: ["Space"], description: "Play selected spectrograms" },
    { keys: ["Alt", "number"], description: "Keyboard selection" },
    { keys: ["f11"], description: "Fullscreen" },
    { keys: ["Ctrl", "a"], description: "Select all" },
    { keys: ["Esc"], description: "Deselect all" },
    { keys: ["Ctrl", mouseClick], description: "Toggle selection" },
    { keys: [shiftSymbol, mouseClick], description: "Exclusive range selection" },
    { keys: ["Ctrl", shiftSymbol, mouseClick], description: "Additive range selection" },
    { keys: ["Left"], description: "Move selection back" },
    { keys: ["Right"], description: "Move selection forwards" },
    { keys: ["PageUp"], description: "Previous Page" },
    { keys: ["PageNext"], description: "Next Page" },
    { keys: ["Home"], description: "Select first tile on page" },
    { keys: ["End"], description: "Select last tile on page" },
  ] satisfies KeyboardShortcut[];

  const slideTemplate = html`
    <div class="advanced-shortcuts-slide slide">
      <div class="shortcuts-container">
        <table class="shortcuts-table">
          <tbody>
            ${keyboardShortcuts.map(
              (shortcut) => html`
                <tr class="shortcut-row">
                  <td>${shortcut.description}</td>
                  <td class="shortcut-prompt">${keyboardShortcutTemplate(shortcut)}</td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return { slideTemplate, title };
}
