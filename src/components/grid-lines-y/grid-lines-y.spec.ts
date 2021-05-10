import { newSpecPage } from '@stencil/core/testing';
import { GridLinesY } from './grid-lines-y';

describe('grid-lines-y', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [GridLinesY],
      html: '<grid-lines-y></grid-lines-y>',
    });
    expect(root).toEqualHtml(`
      <grid-lines-y>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </grid-lines-y>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [GridLinesY],
      html: `<grid-lines-y first="Stencil" last="'Don't call me a framework' JS"></grid-lines-y>`,
    });
    expect(root).toEqualHtml(`
      <grid-lines-y first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </grid-lines-y>
    `);
  });
});
