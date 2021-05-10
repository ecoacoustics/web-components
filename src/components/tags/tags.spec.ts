import { newSpecPage } from '@stencil/core/testing';
import { Tags } from './tags';

describe('x-tags', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [Tags],
      html: '<x-tags></x-tags>',
    });
    expect(root).toEqualHtml(`
      <x-tags>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </x-tags>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [Tags],
      html: `<x-tags first="Stencil" last="'Don't call me a framework' JS"></x-tags>`,
    });
    expect(root).toEqualHtml(`
      <x-tags first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </x-tags>
    `);
  });
});
