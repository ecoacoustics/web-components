import { newSpecPage } from '@stencil/core/testing';
import { AxisY } from './axis-y';

describe('axis-y', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [AxisY],
      html: '<axis-y></axis-y>',
    });
    expect(root).toEqualHtml(`
      <axis-y>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </axis-y>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [AxisY],
      html: `<axis-y first="Stencil" last="'Don't call me a framework' JS"></axis-y>`,
    });
    expect(root).toEqualHtml(`
      <axis-y first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </axis-y>
    `);
  });
});
