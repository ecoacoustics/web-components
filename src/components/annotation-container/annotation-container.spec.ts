import { newSpecPage } from '@stencil/core/testing';
import { AnnotationContainer } from './annotation-container';

describe('annotation-container', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [AnnotationContainer],
      html: '<annotation-container></annotation-container>',
    });
    expect(root).toEqualHtml(`
      <annotation-container>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </annotation-container>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [AnnotationContainer],
      html: `<annotation-container first="Stencil" last="'Don't call me a framework' JS"></annotation-container>`,
    });
    expect(root).toEqualHtml(`
      <annotation-container first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </annotation-container>
    `);
  });
});
