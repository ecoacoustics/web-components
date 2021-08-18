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
  @State() mediaSource: typeof Globals._win.HTMLMediaElement;

  // Observable fires on window resize. TODO find a way to do this on container resize
  @Prop({ mutable: true }) containerResize;

  componentWillLoad() {
    this.containerResize = fromEvent(Globals._win, 'resize');
  }

  render() {
    return (
      <div style={{ width: '100px', height: '100px' }}>
        <svg></svg>
      </div>
    );
  }
}
