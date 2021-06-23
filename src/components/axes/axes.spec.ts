import { newSpecPage } from '@stencil/core/testing';
import { Axes } from './axes';

describe('x-axes', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [Axes],
      html: '<x-axes></x-axes>',
    });
    expect(root).toEqualHtml(`
      <x-axes>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </x-axes>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [Axes],
      html: `<x-axes first="Stencil" last="'Don't call me a framework' JS"></x-axes>`,
    });
    expect(root).toEqualHtml(`
      <x-axes first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </x-axes>
    `);
  });
});
