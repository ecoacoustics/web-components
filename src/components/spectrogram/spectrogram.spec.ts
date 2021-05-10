import { newSpecPage } from '@stencil/core/testing';
import { Spectrogram } from './spectrogram';

describe('x-spectrogram', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [Spectrogram],
      html: '<x-spectrogram></x-spectrogram>',
    });
    expect(root).toEqualHtml(`
      <x-spectrogram>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </x-spectrogram>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [Spectrogram],
      html: `<x-spectrogram first="Stencil" last="'Don't call me a framework' JS"></x-spectrogram>`,
    });
    expect(root).toEqualHtml(`
      <x-spectrogram first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </x-spectrogram>
    `);
  });
});
