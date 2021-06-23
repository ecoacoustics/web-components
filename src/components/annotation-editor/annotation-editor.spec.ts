import { newSpecPage } from '@stencil/core/testing';
import { AnnotationEditor } from './annotation-editor';

describe('annotation-editor', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [AnnotationEditor],
      html: '<annotation-editor></annotation-editor>',
    });
    expect(root).toEqualHtml(`
      <annotation-editor>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </annotation-editor>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [AnnotationEditor],
      html: `<annotation-editor first="Stencil" last="'Don't call me a framework' JS"></annotation-editor>`,
    });
    expect(root).toEqualHtml(`
      <annotation-editor first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </annotation-editor>
    `);
  });
});
