import { Component, Prop, Element, State, h } from '@stencil/core';
import { drawYAxis } from '../../utils/axes';

import { fromEvent } from 'rxjs';

import Globals from '../../utils/globals';

@Component({
  tag: 'ewc-axes',
  styleUrl: 'axes.css',
  shadow: true,
})
export class Axes {
  @Element() el;

  // The id of the HTMLMediaElement
  @Prop() media: string;
  // Media source reference retrieved by getMedia
  @State() mediaSource: typeof Globals._win.HTMLMediaElement.prototype;

  // The id of the target element
  @Prop() for: string;
  // Reference to the target element
  @State() forElement: typeof Globals._win.HTMLElement.prototype;

  // Position and size of element retrieved from target element
  @State() left: number = 0;
  @State() top: number = 0;
  @State() width: number = 0;
  @State() height: number = 0;

  @Prop() border: number = 30;

  // Observable fires on window resize. TODO find a way to do this on container resize
  @Prop({ mutable: true }) containerResize;

  componentWillLoad() {
    this.containerResize = fromEvent(Globals._win, 'resize');

    this.forElement = this.el.ownerDocument.querySelector(`#${this.for}`);

    this.containerResize.subscribe(e => this.followTarget());
    this.followTarget();
  }

  followTarget() {
    let bounds = this.forElement.getBoundingClientRect();
    console.log(this.top);
    this.left = bounds.left - this.border;
    this.top = bounds.top;
    this.width = bounds.width + this.border;
    this.height = bounds.height + this.border;
  }

  render() {
    return (
      <div style={{ left: `${this.left}px`, top: `${this.top}px`, width: `${this.width}px`, height: `${this.height}px` }}>
        <svg width={`${this.width}px`} height={`${this.height}px`}></svg>
      </div>
    );
  }
}
