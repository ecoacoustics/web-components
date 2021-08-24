import { axisLeft, axisBottom } from 'd3-axis';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';

export function drawYAxis(surface, size, border, dataMin, dataMax) {
  let scale = scaleLinear()
    .domain([dataMin, dataMax])
    .range([0, size.height - border]);
  console.log(size.height);
  let translate = `translate(${border}, 0)`;
  drawAxis(surface, size, axisLeft, scale, translate, 'y_axis');
}
export function drawXAxis(surface, size, border, dataMin, dataMax) {
  let scale = scaleLinear().domain([dataMin, dataMax]).range([size.width, 0]);
  let translate = `translate(${border}, ${size.height - border})`;
  drawAxis(surface, size, axisBottom, scale, translate, 'x_axis');
}

export function drawAxis(surface, size, axis, scale, translate, id) {
  let width = size.width,
    height = size.height;

  let svg = select(surface).attr('width', width).attr('height', height);

  let a = axis().scale(scale);

  svg.select(`#${id}`).node() ? svg.select(`#${id}`).call(a) : svg.append('g').attr('transform', translate).attr('id', id).call(a);
}
