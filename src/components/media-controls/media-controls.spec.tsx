import { newSpecPage } from '@stencil/core/testing';
import { jest } from '@jest/globals';
// eslint-disable-next-line no-unused-vars
import { h } from '@stencil/core';
import { MediaControls } from './media-controls';
import globals from '../../utils/globals';
import { TestHTMLElement, TestHTMLMediaElement } from '../../test/types';

beforeEach(() => {
  let logger = globals._logger;
  logger.log = jest.fn();
  logger.warn = jest.fn();

  //let win = globals._win;
  globals._win.HTMLElement = TestHTMLElement;
  globals._win.HTMLMediaElement = TestHTMLMediaElement;
});

describe('ewc-media-controls', () => {
  it('Warns and renders if no media source is given', async () => {
    const { root } = await newSpecPage({
      components: [MediaControls],
      template: () => <ewc-media-controls></ewc-media-controls>,
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

    expect(globals._logger.warn).toBeCalled();
  });

  // it('Throws an error when the media element does not exist', async () => {
  //   const { root, waitForChanges } = await newSpecPage({
  //     components: [MediaControls],
  //     html: `
  //       <ewc-media-controls></ewc-media-controls>
  //     `,
  //   });

  //   root.for = 'media';

  //   return expect(waitForChanges()).rejects.toEqual(new MediaException('The HTMLElement media does not exist'));
  // });

  // it('Throws an error when the element is not a HTMLMediaElement', async () => {
  //   const { root, waitForChanges } = await newSpecPage({
  //     components: [MediaControls],
  //     html: `
  //       <div id="media"></div>
  //       <ewc-media-controls></ewc-media-controls>
  //     `,
  //   });
  //   root.logger = logger;
  //   root.for = 'media';

  //   return expect(waitForChanges()).rejects.toEqual(new MediaException('The HTMLElement media is not a HTMLMediaElement'));
  // });

  // it('Renders if the element is a HTMLMediaElement', async () => {
  //   const { root } = await newSpecPage({
  //     components: [MediaControls],
  //     html: `
  //       <audio id="allow-unsafe"></audio>
  //       <ewc-media-controls for="allow-unsafe"></ewc-media-controls>
  //     `,
  //   });

  //   expect(root).toEqualHtml(`
  //     <ewc-media-controls for="allow-unsafe">
  //       <mock:shadow-root>
  //         <div>
  //           <button>
  //             Pause
  //           </button>
  //         </div>
  //       </mock:shadow-root>
  //     </ewc-media-controls>
  //   `);
  // });
});
