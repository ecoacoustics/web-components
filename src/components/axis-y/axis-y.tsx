import { Component, Element, Prop, h, State } from '@stencil/core';

import Globals from '../../utils/globals';
import { drawYAxis } from '../../utils/axes';

@Component({
  tag: 'ewc-axis-y',
  styleUrl: 'axis-y.css',
  shadow: true,
})
export class AxisY {
  @Element() el;

  @Prop() disabled: boolean = false;

  @State() size: typeof Globals._win.DOMRect.prototype;
  @State() surface: typeof Globals._win.SVGElement.prototype;

  componentWillLoad() {
    this.redraw();
    this.el.parentElement.containerResize.subscribe(e => this.redraw());
  }

  redraw() {
    this.surface = this.el.parentElement.shadowRoot.querySelector('div svg');
    this.size = this.el.ownerDocument.querySelector(`#${this.el.parentElement.for}`).getBoundingClientRect();

    drawYAxis(this.surface, this.size, this.el.parentElement.border, 10, 0);
  }

  render() {
    {
      /** This component modifies its parent, so it doesn't need to render anything */
    }
  }
}
