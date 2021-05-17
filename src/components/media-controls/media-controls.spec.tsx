import { newSpecPage } from '@stencil/core/testing';
import { MediaControls } from './media-controls';
import { MediaException } from '../../utils/media';
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { h } from '@stencil/core';

console.warn = jest.fn();
console.error = jest.fn();

var dom = new JSDOM();
global.window = dom.window;

describe('ewc-media-controls', () => {
  it('Warns and renders if no media source is given', async () => {
    const { root, win } = await newSpecPage({
      components: [MediaControls],
      html: '<ewc-media-controls></ewc-media-controls>',
    });
    expect(root).toEqualHtml(`
      <ewc-media-controls>
        <mock:shadow-root>
          <div>
            <button>
              Pause
            </button>
          </div>
        </mock:shadow-root>
      </ewc-media-controls>
    `);
    expect(console.warn).toBeCalled();
  });

  it('Throws an error when the media element does not exist', async () => {
    const { root, waitForChanges } = await newSpecPage({
      components: [MediaControls],
      html: `
        <ewc-media-controls></ewc-media-controls>
      `,
    });

    root.for = 'media';

    return expect(waitForChanges()).rejects.toEqual(new MediaException('The HTMLElement media does not exist'));
  });

  it('Throws an error when the element is not a HTMLMediaElement', async () => {
    const { root, waitForChanges, doc } = await newSpecPage({
      components: [MediaControls],
      html: `
        <div id="media"></div>
        <ewc-media-controls></ewc-media-controls>
      `,
    });
    root.for = 'media';

    return expect(waitForChanges()).rejects.toEqual(new MediaException('The HTMLElement media is not a HTMLMediaElement'));
  });

  it('Renders if the element is a HTMLMediaElement', async () => {
    const { root } = await newSpecPage({
      components: [MediaControls],
      html: `
        <audio id="allow-unsafe"></audio>
        <ewc-media-controls for="allow-unsafe"></ewc-media-controls>
      `,
    });

    expect(root).toEqualHtml(`
      <ewc-media-controls for="allow-unsafe">
        <mock:shadow-root>
          <div>
            <button>
              Pause
            </button>
          </div>
        </mock:shadow-root>
      </ewc-media-controls>
    `);
  });

  it('Renders a back button if onBack is defined', async () => {
    let f = () => {};
    const { root } = await newSpecPage({
      components: [MediaControls],
      template: () => <ewc-media-controls onBack={f}></ewc-media-controls>,
    });

    return expect(root).toEqualHtml(`
    <ewc-media-controls>
        <mock:shadow-root>
          <div>
            <button>
              Back
            </button>
            <button>
              Pause
            </button>
          </div>
        </mock:shadow-root>
      </ewc-media-controls>`);
  });

  it('Renders a back and forward buttons if onBack and onForward are defined', async () => {
    let f = () => {};
    const { root } = await newSpecPage({
      components: [MediaControls],
      template: () => <ewc-media-controls onBack={f} onForward={f}></ewc-media-controls>,
    });

    return expect(root).toEqualHtml(`
    <ewc-media-controls>
        <mock:shadow-root>
          <div>
            <button>
              Back
            </button>
            <button>
              Pause
            </button>
            <button>
              Forward
            </button>
          </div>
        </mock:shadow-root>
      </ewc-media-controls>`);
  });
});
