import { newSpecPage } from '@stencil/core/testing';
import { Coords } from './coords';

describe('x-coords', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [Coords],
      html: '<x-coords></x-coords>',
    });
    expect(root).toEqualHtml(`
      <x-coords>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </x-coords>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [Coords],
      html: `<x-coords first="Stencil" last="'Don't call me a framework' JS"></x-coords>`,
    });
    expect(root).toEqualHtml(`
      <x-coords first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </x-coords>
    `);
  });
});
