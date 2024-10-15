import { html, nothing } from "lit";
import { SpectrogramOptions } from "../helpers/audio/models";
import { AxesOptions } from "index";
import { SlMenuItem } from "@shoelace-style/shoelace";
import { colorScales } from "../helpers/audio/colors";
import { windowFunctions } from "../helpers/audio/window";
import { ChangeEvent } from "../helpers/types/advancedTypes";
import { Signal } from "@lit-labs/preact-signals";

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
      <sl-menu slot="submenu">
        ${checkboxSettingTemplate(
          "X-Axis Title",
          currentOptions.showXTitle,
          checkboxChangeHandler(axesOptions, "showXTitle"),
        )}
        ${checkboxSettingTemplate(
          "Y-Axis Title",
          currentOptions.showYTitle,
          checkboxChangeHandler(axesOptions, "showYTitle"),
        )}
        ${checkboxSettingTemplate(
          "X-Axis Labels",
          currentOptions.showXAxis,
          checkboxChangeHandler(axesOptions, "showXAxis"),
        )}
        ${checkboxSettingTemplate(
          "Y-Axis Labels",
          currentOptions.showYAxis,
          checkboxChangeHandler(axesOptions, "showYAxis"),
        )}
        ${checkboxSettingTemplate(
          "X-Axis Grid Lines",
          currentOptions.showXGrid,
          checkboxChangeHandler(axesOptions, "showXGrid"),
        )}
        ${checkboxSettingTemplate(
          "Y-Axis Grid Lines",
          currentOptions.showYGrid,
          checkboxChangeHandler(axesOptions, "showYGrid"),
        )}
      </sl-menu>
    </sl-menu-item>
  `;
}

function discreteSettingsTemplate(
  text: string,
  values: string[] | number[] | ReadonlyArray<number | string>,
  currentValue: string | number | boolean,
  changeHandler: (event: CustomEvent<{ item: SlMenuItem }>) => void,
) {
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
) {
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

function checkboxSettingTemplate(text: string, checked: boolean, changeHandler: any) {
  return html`
    <sl-menu-item>
      <label>
        <input @change="${changeHandler}" type="checkbox" name="showXGrid" ?checked=${checked} />
        ${text}
      </label>
    </sl-menu-item>
  `;
}

function discreteDropdownHandler<T>(options: Signal<T>, key: keyof T) {
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

function checkboxChangeHandler<T>(options: Signal<T>, key: keyof T) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    options.value = {
      ...options.value,
      [key]: newValue,
    };
  };
}
