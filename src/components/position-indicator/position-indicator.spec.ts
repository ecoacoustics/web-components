import { newSpecPage } from '@stencil/core/testing';
import { PositionIndicator } from './position-indicator';

describe('position-indicator', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [PositionIndicator],
      html: '<position-indicator></position-indicator>',
    });
    expect(root).toEqualHtml(`
      <position-indicator>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </position-indicator>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [PositionIndicator],
      html: `<position-indicator first="Stencil" last="'Don't call me a framework' JS"></position-indicator>`,
    });
    expect(root).toEqualHtml(`
      <position-indicator first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </position-indicator>
    `);
  });
});
