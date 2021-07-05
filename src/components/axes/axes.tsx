import { Component, Prop, Element, State, h } from '@stencil/core';
import { axisLeft, axisBottom } from 'd3-axis';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { min, max } from 'd3-array';

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

  @State() surface: typeof Globals._win.SVGElement.prototype;

  @State() size: { width: number; height: number } = { width: 0, height: 0 };

  componentDidLoad() {
    this.surface.parentElement.onresize = () => {
      let bounds = this.surface.parentElement.getBoundingClientRect();
      this.size = { width: bounds.width, height: bounds.height };
    };
    let bounds = this.surface.parentElement.getBoundingClientRect();
    this.size = { width: bounds.width, height: bounds.height };

    this.drawYAxis(30, 10);
    this.drawXAxis(30, 0);
    //this.drawAxis(axisBottom);
  }

  drawYAxis(dataMin, dataMax) {
    let scale = scaleLinear()
      .domain([dataMin, dataMax])
      .range([0, this.size.height - 30]);
    let translate = `translate(30, 10)`;
    this.drawAxis(axisLeft, scale, translate);
  }
  drawXAxis(dataMin, dataMax) {
    let scale = scaleLinear()
      .domain([dataMin, dataMax])
      .range([this.size.width - 60, 0]);
    let translate = `translate(30, ${this.size.height - 20})`;
    this.drawAxis(axisBottom, scale, translate);
  }

  drawAxis(axis, scale, translate) {
    let width = this.size.width,
      height = this.size.height;

    let svg = select(this.surface).attr('width', width).attr('height', height);

    let a = axis().scale(scale);

    svg.append('g').attr('transform', translate).call(a);
  }

  render() {
    return (
      <div>
        <svg ref={element => (this.surface = element as typeof Globals._win.SVGElement.prototype)}></svg>
      </div>
    );
  }
}
