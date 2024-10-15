import { html, nothing, TemplateResult } from "lit";
import { SpectrogramOptions } from "../helpers/audio/models";
import { AxesComponent, AxesOptions } from "index";
import { SlMenuItem } from "@shoelace-style/shoelace";
import { colorScales } from "../helpers/audio/colors";
import { windowFunctions } from "../helpers/audio/window";
import { ChangeEvent } from "../helpers/types/advancedTypes";
import { Signal } from "@lit-labs/preact-signals";

type SettingsChangeHandler = (event: CustomEvent<{ item: SlMenuItem }>) => void;

export function settingsTemplateFactory(
  spectrogramOptions?: Signal<SpectrogramOptions>,
  axesOptions?: Signal<AxesOptions>,
) {
  if (!spectrogramOptions && !axesOptions) {
    return nothing;
  }

  return html`
    <sl-menu>
      ${spectrogramOptions ? spectrogramSettingsTemplate(spectrogramOptions) : nothing}
      ${axesOptions ? axesSettingsTemplate(axesOptions) : nothing}
    </sl-menu>
  `;
}

function discreteDropdownHandler<T>(options: Signal<T>, key: keyof T): SettingsChangeHandler {
  return (event: CustomEvent<{ item: SlMenuItem }>) => {
    const newValue = event.detail.item.value as any;
    options.value = {
      ...options.value,
      [key]: newValue,
    };
  };
}

function rangeInputHandler<T>(options: Signal<T>, key: keyof T) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(event.target.value);
    if (Number.isNaN(newValue)) {
      throw new Error("Invalid number");
    }

    options.value = {
      ...options.value,
      [key]: newValue,
    };
  };
}

// TODO: make this more generic
function axesChangeHandler(options: Signal<AxesOptions>) {
  return (event: CustomEvent<{ item: SlMenuItem }>) => {
    const menuItem = event.detail.item;
    const checkboxElement = menuItem.querySelector<HTMLInputElement>("input[type=checkbox]");

    if (!checkboxElement) {
      throw new Error("No checkbox element found");
    }

    const key = checkboxElement.name as keyof AxesComponent;
    const value = checkboxElement.checked;

    options.value = {
      ...options.value,
      [key]: value,
    };
  };
}

function discreteSettingsTemplate(
  text: string,
  values: string[] | number[] | ReadonlyArray<number | string>,
  currentValue: string | number | boolean,
  changeHandler: (event: CustomEvent<{ item: SlMenuItem }>) => void,
): TemplateResult {
  return html`
    <sl-menu-item>
      ${text}
      <sl-menu @sl-select="${changeHandler}" slot="submenu">
        ${values.map(
          (value) =>
            html`<sl-menu-item
              type="${value == currentValue ? "checkbox" : "normal"}"
              value="${value}"
              ?checked=${value == currentValue}
            >
              ${value}
            </sl-menu-item>`,
        )}
      </sl-menu>
    </sl-menu-item>
  `;
}

function rangeSettingsTemplate(
  text: string,
  min: number,
  max: number,
  step: number,
  currentValue: number,
  changeHandler: any,
): TemplateResult {
  return html`
    <sl-menu-item>
      ${text}
      <sl-menu slot="submenu">
        <label>
          <input
            @change="${changeHandler}"
            type="range"
            min="${min}"
            max="${max}"
            step="${step}"
            value="${currentValue}"
          />
        </label>
      </sl-menu>
    </sl-menu-item>
  `;
}

function spectrogramSettingsTemplate(spectrogramOptions: Signal<SpectrogramOptions>) {
  // we use peek() here so that we don't create a subscription
  const currentValue = spectrogramOptions.peek();
  const possibleWindowSizes = [128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  const possibleWindowOverlaps = possibleWindowSizes;

  return html`
    ${discreteSettingsTemplate(
      "Colour",
      Object.keys(colorScales),
      currentValue.colorMap ?? "grayscale",
      discreteDropdownHandler(spectrogramOptions, "colorMap"),
    )}
    ${rangeSettingsTemplate(
      "Brightness",
      -0.5,
      0.5,
      0.01,
      currentValue.brightness ?? 0,
      rangeInputHandler(spectrogramOptions, "brightness"),
    )}
    ${rangeSettingsTemplate(
      "Contrast",
      0,
      2,
      0.01,
      currentValue.contrast,
      rangeInputHandler(spectrogramOptions, "contrast"),
    )}
    ${discreteSettingsTemplate(
      "Window Function",
      Array.from(windowFunctions.keys()),
      currentValue.windowFunction,
      discreteDropdownHandler(spectrogramOptions, "windowFunction"),
    )}
    ${discreteSettingsTemplate(
      "Window Size",
      possibleWindowSizes,
      currentValue.windowSize,
      discreteDropdownHandler(spectrogramOptions, "windowSize"),
    )}
    ${discreteSettingsTemplate(
      "Window Overlap",
      [0, ...possibleWindowOverlaps],
      currentValue.windowOverlap,
      discreteDropdownHandler(spectrogramOptions, "windowOverlap"),
    )}
    ${discreteSettingsTemplate(
      "Scale",
      ["linear", "mel"],
      currentValue.melScale ? "mel" : "linear",
      discreteDropdownHandler(spectrogramOptions, "melScale"),
    )}
  `;
}

function axesSettingsTemplate(axesOptions: Signal<AxesOptions>) {
  // we use peek() here so that we don't create a subscription
  const currentOptions = axesOptions.peek();

  return html`
    <sl-menu-item>
      Axes
      <sl-menu @sl-select="${axesChangeHandler(axesOptions)}" slot="submenu">
        <sl-menu-item>
          <label>
            <input type="checkbox" name="showXTitle" ?checked=${currentOptions.showXTitle} />
            X-Axis Title
          </label>
        </sl-menu-item>

        <sl-menu-item>
          <label>
            <input type="checkbox" name="showYTitle" ?checked=${currentOptions.showYTitle} />
            Y-Axis Title
          </label>
        </sl-menu-item>

        <sl-menu-item>
          <label>
            <input type="checkbox" name="showXAxis" ?checked=${currentOptions.showXAxis} />
            X-Axis Labels
          </label>
        </sl-menu-item>

        <sl-menu-item>
          <label>
            <input type="checkbox" name="showYAxis" ?checked=${currentOptions.showYAxis} />
            Y-Axis Labels
          </label>
        </sl-menu-item>

        <sl-menu-item>
          <label>
            <input type="checkbox" name="showXGrid" ?checked=${currentOptions.showXGrid} />
            X-Axis Grid Lines
          </label>
        </sl-menu-item>

        <sl-menu-item>
          <label>
            <input type="checkbox" name="showYGrid" ?checked=${currentOptions.showYGrid} />
            Y-Axis Grid Lines
          </label>
        </sl-menu-item>
      </sl-menu>
    </sl-menu-item>
  `;
}
