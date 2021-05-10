import { newSpecPage } from '@stencil/core/testing';
import { GridLinesX } from './grid-lines-x';

describe('grid-lines-x', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [GridLinesX],
      html: '<grid-lines-x></grid-lines-x>',
    });
    expect(root).toEqualHtml(`
      <grid-lines-x>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </grid-lines-x>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [GridLinesX],
      html: `<grid-lines-x first="Stencil" last="'Don't call me a framework' JS"></grid-lines-x>`,
    });
    expect(root).toEqualHtml(`
      <grid-lines-x first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </grid-lines-x>
    `);
  });
});
