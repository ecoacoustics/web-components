import { newSpecPage } from '@stencil/core/testing';
import { Annotation } from './annotation';

describe('x-annotation', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [Annotation],
      html: '<x-annotation></x-annotation>',
    });
    expect(root).toEqualHtml(`
      <x-annotation>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </x-annotation>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [Annotation],
      html: `<x-annotation first="Stencil" last="'Don't call me a framework' JS"></x-annotation>`,
    });
    expect(root).toEqualHtml(`
      <x-annotation first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </x-annotation>
    `);
  });
});
