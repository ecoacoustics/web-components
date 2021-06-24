import { Component, Prop, State, Element, h } from '@stencil/core';
import Globals from '../../utils/globals';
import { getMedia } from '../../utils/media';
import { fromEvent } from 'rxjs';
import { mergeWith } from 'rxjs/operators';

@Component({
  tag: 'ewc-position-indicator',
  styleUrl: 'position-indicator.css',
  shadow: true,
})
export class PositionIndicator {
  @Element() el;

  // The id of the HTMLMediaElement
  @Prop() for: string;

  // The currunt time in percent
  @Prop() startTime: number = 0;

  @State() currentTime: number;

  // Media source reference retrieved by getMedia
  @State() mediaSource: typeof Globals._win.HTMLMediaElement.prototype;

  // The duration of the audio source in seconds
  @State() duration: number;

  // Is the handle currently being dragged?
  @State() dragging: boolean;

  // The owner of the component (document)
  owner: typeof Globals._win.HTMLElement.prototype;

  // Reference to the position indicator slider
  slider: typeof Globals._win.HTMLInputElement.prototype;

  setup() {
    // Get the media Source
    this.mediaSource = getMedia(this.for, this.owner);
    this.slider.max = `${this.mediaSource.duration}`;

    // Update while playing and drag logic
    let timeUpdate = fromEvent(this.mediaSource, 'timeupdate');
    let sliderUp = fromEvent(this.slider, 'mouseup');
    let sliderDown = fromEvent(this.slider, 'mousedown');

    timeUpdate.pipe(mergeWith(sliderUp), mergeWith(sliderDown)).subscribe(event => {
      if (event.type === 'mouseup') {
        this.mediaSource.currentTime = +this.slider.value;
        this.dragging = false;
      } else if (event.type === 'mousedown') {
        this.dragging = true;
        console.log(this.dragging);
      } else if (event.type === 'timeupdate') {
        this.currentTime = this.mediaSource.currentTime;
        if (!this.dragging) {
          this.slider.value = `${this.mediaSource.currentTime}`;
        }
      }
    });

    this.mediaSource.ondurationchange = () => {
      this.duration = this.mediaSource.duration;
      console.log(this.duration);
    };
  }

  componentWillLoad() {
    this.owner = this.el.ownerDocument as typeof Globals._win.HTMLElement.prototype;
  }

  componentDidLoad() {
    this.setup();
  }

  componentWillUpdate() {
    this.setup();
  }

  render() {
    return (
      <div>
        <input ref={el => (this.slider = el)} type="range" min={0} max={this.duration} step={0.1} />
      </div>
    );
  }
}
