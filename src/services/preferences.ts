import { signal, Signal } from "@lit-labs/preact-signals";
import { SpectrogramOptions } from "../helpers/audio/models";

export class PreferencesService {
  private constructor() {}

  public get instance(): PreferencesService {
    return this;
  }

  public spectrogramOptions: Signal<SpectrogramOptions | null> = signal<SpectrogramOptions | null>(
    this.loadSpectrogramOptions(),
  );
  private spectrogramOptionsStorageKey = "spectrogramOptions";

  private loadSpectrogramOptions(): SpectrogramOptions | null {
    const localStorage = window.localStorage.getItem(this.spectrogramOptionsStorageKey);
    if (localStorage) {
      return JSON.parse(localStorage);
    }

    return null;
  }
}
