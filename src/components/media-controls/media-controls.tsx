// eslint-disable-next-line no-unused-vars
import { Element, Component, Prop, State, h } from '@stencil/core';
import { getMedia } from '../../utils/media';

@Component({
  tag: 'ewc-media-controls',
  styleUrl: 'media-controls.css',
  shadow: true,
})
// eslint-disable-next-line import/prefer-default-export
export class MediaControls {
  @Element() el;

  // The id of the HTMLMediaElement
  @Prop() for: string;

  // Media source reference retrieved by getMedia
  @State() mediaSource: globalThis.HTMLMediaElement;

  // The owner of the component (document)
  owner: globalThis.HTMLElement;

  @State() mediaPaused: boolean;

  componentWillLoad() {
    this.owner = this.el.ownerDocument as globalThis.HTMLElement;
    this.mediaSource = getMedia(this.for, this.owner);
    this.addPlayPauseListener();
  }

  componentWillUpdate() {
    this.mediaSource = getMedia(this.for, this.owner);
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
    if (this.mediaSource.paused) {
      this.playSource();
    } else {
      this.pauseSource();
    }
  };

  render() {
    return (
      <div>
        <button onClick={this.toggleSource}>{this.mediaPaused ? 'Play' : 'Pause'}</button>
      </div>
    );
  }
}
