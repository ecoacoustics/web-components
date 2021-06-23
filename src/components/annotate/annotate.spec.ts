import { newSpecPage } from '@stencil/core/testing';
import { Annotate } from './annotate';

describe('x-annotate', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [Annotate],
      html: '<x-annotate></x-annotate>',
    });
    expect(root).toEqualHtml(`
      <x-annotate>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </x-annotate>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [Annotate],
      html: `<x-annotate first="Stencil" last="'Don't call me a framework' JS"></x-annotate>`,
    });
    expect(root).toEqualHtml(`
      <x-annotate first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </x-annotate>
    `);
  });
});
