import { Component, Element, Prop, h, State } from '@stencil/core';

import Globals from '../../utils/globals';
import { drawXAxis } from '../../utils/axes';

@Component({
  tag: 'ewc-axis-x',
  styleUrl: 'axis-x.css',
  shadow: true,
})
export class AxisX {
  @Element() el;

  @Prop() disabled: boolean = false;

  @State() size: number;
  @State() surface: typeof Globals._win.SVGElement.prototype;

  componentWillLoad() {
    this.redraw();
    this.el.parentElement.containerResize.subscribe(e => this.redraw());
  }

  redraw() {
    this.size = this.el.parentElement.getBoundingClientRect();
    this.surface = this.el.parentElement.shadowRoot.querySelector('div svg');

    drawXAxis(this.surface, this.size, 30, 0);
  }

  render() {
    {
      /** This component modifies its parent, so it doesn't need to render anything */
    }
  }
}
