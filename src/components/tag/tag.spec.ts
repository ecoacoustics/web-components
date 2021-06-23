import { newSpecPage } from '@stencil/core/testing';
import { Tag } from './tag';

describe('x-tag', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [Tag],
      html: '<x-tag></x-tag>',
    });
    expect(root).toEqualHtml(`
      <x-tag>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </x-tag>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [Tag],
      html: `<x-tag first="Stencil" last="'Don't call me a framework' JS"></x-tag>`,
    });
    expect(root).toEqualHtml(`
      <x-tag first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </x-tag>
    `);
  });
});
