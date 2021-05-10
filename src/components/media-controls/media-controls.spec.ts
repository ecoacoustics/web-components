import { newSpecPage } from '@stencil/core/testing';
import { MediaControls } from './media-controls';

describe('media-controls', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [MediaControls],
      html: '<media-controls></media-controls>',
    });
    expect(root).toEqualHtml(`
      <media-controls>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </media-controls>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [MediaControls],
      html: `<media-controls first="Stencil" last="'Don't call me a framework' JS"></media-controls>`,
    });
    expect(root).toEqualHtml(`
      <media-controls first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </media-controls>
    `);
  });
});
