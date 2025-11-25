import { ReactiveController, ReactiveControllerHost } from "lit";
import { Seconds } from "../../models/unitConverters";
import { SetTimeoutRef } from "../types/advancedTypes";
import { secondsToMilliseconds } from "../utilities";
import { ReadonlySignal, signal, Signal } from "@lit-labs/preact-signals";

// We use a const enum here so that the enum is inlined at compile time.
// This avoids the drawbacks that regular TypeScript enums observe such as a lot
// of generated code overhead for reverse mappings.
// see: https://www.typescriptlang.org/docs/handbook/enums.html#enums-at-compile-time
export const enum LoadingState {
  /** There is no loading in progress */
  Idle,

  /**
   * Items are being loaded, but the time spent loading has not met the
   * "slow loading" threshold, meaning that a loading indicator should not be
   * shown.
   */
  FastLoading,

  /**
   * Items are being loaded, and the time spent loading has exceeded the
   * "slow loading" threshold, meaning that a loading indicator should be
   * shown.
   */
  SlowLoading,

  /**
   * The time spent loading has exceeded the maximum allowed duration, and
   * we should show a timeout error.
   */
  Timeout,
}

export interface LoadingControllerOptions {
  slowLoadThreshold: Seconds;
  timeoutThreshold: Seconds;
}

interface LoadingControllerHost extends ReactiveControllerHost {}

export class LoadingController implements ReactiveController {
  private static readonly defaultOptions: LoadingControllerOptions = {
    slowLoadThreshold: 0.5,
    timeoutThreshold: 8,
  };

  private readonly state: Signal<LoadingState>;
  private options: LoadingControllerOptions;
  private timeout: SetTimeoutRef | null = null;

  public constructor(
    host: LoadingControllerHost,
    options: LoadingControllerOptions = LoadingController.defaultOptions,
  ) {
    host.addController(this);

    this.state = signal(LoadingState.Idle);
    this.options = options;
  }

  public get loadState(): ReadonlySignal<LoadingState> {
    return this.state;
  }

  public hostConnected(): void {}
  public hostDisconnected(): void {}

  public updateOptions(newOptions: Partial<LoadingControllerOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * @description
   * This method will not immediately enter a "loading" state, but will start a
   * timer for a short period of time (defined by the `slowLoadThreshold`)
   * before entering the loading state.
   */
  public startLoading(): void {
    this.enterFastLoad();
  }

  public finishLoading(): void {
    this.enterIdle();
  }

  private enterIdle(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
      this.state.value = LoadingState.Idle;
    }
  }

  private enterFastLoad(): void {
    // If there is an existing loading timeout, we want to reset it so that we
    // don't incorrectly have two loading timeouts running at the same time.
    this.finishLoading();

    this.timeout = setTimeout(() => this.enterSlowLoad(), secondsToMilliseconds(this.options.slowLoadThreshold));
  }

  private enterSlowLoad(): void {
    this.state.value = LoadingState.SlowLoading;

    const timeoutDelta = this.options.timeoutThreshold - this.options.slowLoadThreshold;
    this.timeout = setTimeout(() => this.enterTimeout(), secondsToMilliseconds(timeoutDelta));
  }

  private enterTimeout(): void {
    this.state.value = LoadingState.Timeout;
  }
}
