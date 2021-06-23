import { newSpecPage } from '@stencil/core/testing';
import { AxisX } from './axis-x';

describe('axis-x', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [AxisX],
      html: '<axis-x></axis-x>',
    });
    expect(root).toEqualHtml(`
      <axis-x>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </axis-x>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [AxisX],
      html: `<axis-x first="Stencil" last="'Don't call me a framework' JS"></axis-x>`,
    });
    expect(root).toEqualHtml(`
      <axis-x first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </axis-x>
    `);
  });
});
