import { Component, Prop, State, h } from '@stencil/core';
import { getMedia } from '../../utils/media';

@Component({
  tag: 'ewc-media-controls',
  styleUrl: 'media-controls.css',
  shadow: true,
})
export class MediaControls {
  // The id of the HTMLMediaElement
  @Prop() for: string;

  // Media control strings
  @Prop() back: string = 'Back';
  @Prop() play: string = 'Play';
  @Prop() pause: string = 'Pause';
  @Prop() forward: string = 'Forward';

  // Action to be performed when the back button is pressed
  @Prop() onBack: VoidFunction;

  // Action to be performed when the forward button is pressed
  @Prop() onForward: VoidFunction;

  // Media source reference retrieved by getMedia
  @State() mediaSource: HTMLMediaElement;
  @State() mediaPaused: boolean;

  componentWillLoad() {
    this.mediaSource = getMedia(this.for);
    this.addPlayPauseListener();
  }

  componentWillUpdate() {
    this.mediaSource = getMedia(this.for);
    this.addPlayPauseListener();
  }

  addPlayPauseListener = () => {
    if (this.mediaSource) {
      this.mediaSource.addEventListener('pause', () => {
        this.mediaPaused = this.mediaSource.paused;
      });
      this.mediaSource.addEventListener('play', () => {
        this.mediaPaused = this.mediaSource.paused;
      });
      this.mediaPaused = this.mediaSource.paused;
    }
  };

  /**
   * Control the media source
   */
  playSource = () => {
    if (this.mediaSource) {
      this.mediaSource.play();
    }
  };
  pauseSource = () => {
    if (this.mediaSource) {
      this.mediaSource.pause();
    }
  };
  toggleSource = () => {
    if (this.mediaSource) {
      this.mediaSource.paused ? this.playSource() : this.pauseSource();
    }
  };

  render() {
    return (
      <div>
        {this.onBack ? <button onClick={this.onBack}>{this.back}</button> : null}
        <button onClick={this.toggleSource}>{this.mediaPaused ? this.play : this.pause}</button>
        {this.onForward ? <button onClick={this.onForward}>{this.forward}</button> : null}
      </div>
    );
  }
}
