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
      { keys: ["Ctrl"], description: "Toggle selection" },
      { keys: ["Shift"], description: "Exclusive range selection" },
      { keys: ["Ctrl", "Shift"], description: "Additive range selection" },
      { keys: ["Ctrl", "a"], description: "Select all" },
      { keys: ["Esc"], description: "Deselect all" },
    ] satisfies KeyboardShortcut[];

    // render out the keyboard shortcuts in a table similar to vscode
    return html`
      <div class="advanced-shortcuts-slide slide">
        <div class="shortcuts-container">
          <table>
            <tbody>
              ${keyboardShortcuts.map(
                (shortcut) => html`
                  <tr>
                    <td>
                      <button class="oe-btn-secondary">Edit Shortcut</button>
                      ${shortcut.description}
                    </td>
                    <td>${keyboardTemplate({ keys: shortcut.keys })}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>
        .shortcuts-container {
          width: 100%;
          overflow-y: auto;
        }

        table {
          width: 100%;
        }

        tbody {
          tr:nth-child(odd) {
            background-color: var(--oe-panel-color);
          }
        }

        tr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding: 0.5rem;
        }

        thead {
          color: black;
          background-color: var(--oe-panel-color);
          border-bottom: 1px solid red;

          th {
            padding: 0.5rem;
          }
        }
      </style>
    `;

    // return html`
    //   <div class="advanced-shortcuts-slide slide">
    //     <div class="shortcuts-container">
    //       <section>
    //         <h3>Playback</h3>
    //         <p>
    //           You can play a single spectrogram by selecting it and pressing the
    //           ${keyboardTemplate({ keys: ["Space"] })} key.
    //         </p>

    //         <p>
    //           ${keyboardTemplate({ keys: ["Space"] })} will play a all selected subjects if you have more than one
    //           selected.
    //         </p>
    //       </section>

    //       <section>
    //         <h3>Keyboard Selection</h3>
    //         <p>You can select subjects by holding the ${keyboardTemplate({ keys: ["Alt"] })} key.</p>
    //       </section>

    //       <section>
    //         <h3>Fullscreen</h3>
    //         <p>Use ${keyboardTemplate({ keys: ["F11"] })} to go into full screen.</p>
    //       </section>

    //       <section>
    //         <h3>Toggle Selection</h3>
    //         <p>
    //           You can add subjects to your current selection by using the ${keyboardTemplate({ keys: ["Ctrl"] })} key.
    //         </p>
    //       </section>

    //       <section>
    //         <h3>Exclusive Selection</h3>
    //         <p>You can select a range of subjects by holding the ${keyboardTemplate({ keys: ["Shift"] })} key.</p>
    //       </section>

    //       <section>
    //         <h3>Additive Range Selection</h3>
    //         <p>
    //           You can add a range of subjects to your current selection by holding the
    //           ${keyboardTemplate({ keys: ["Shift", "Ctrl"] })} key.
    //         </p>
    //       </section>

    //       <section>
    //         <h3>Select All</h3>
    //         <p>
    //           Select all visible subjects by pressing the ${keyboardTemplate({ keys: ["Ctrl", "a"] })} key combination.
    //         </p>
    //       </section>

    //       <section>
    //         <h3>Deselect All</h3>
    //         <p>Deselect all subjects by pressing the ${keyboardTemplate({ keys: ["Ctrl", "d"] })} key combination.</p>
    //       </section>
    //     </div>
    //   </div>
    // `;
  }
}
