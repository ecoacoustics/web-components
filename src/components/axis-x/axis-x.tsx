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

  @State() size: typeof Globals._win.DOMRect.prototype;
  @State() surface: typeof Globals._win.SVGElement.prototype;

  componentWillLoad() {
    //this.redraw();
    this.el.parentElement.containerResize.subscribe(e => this.redraw());
  }

  redraw() {
    this.surface = this.el.parentElement.shadowRoot.querySelector('div svg');
    this.size = this.el.ownerDocument.querySelector(`#${this.el.parentElement.for}`).getBoundingClientRect();

    drawXAxis(this.surface, this.size, this.el.parentElement.border, 30, 0);
  }

  render() {
    {
      /** This component modifies its parent, so it doesn't need to render anything */
    }
  }
}
