/* eslint-disable no-undef */
import { newE2EPage } from '@stencil/core/testing';

describe('media-controls', () => {
  it('renders', async () => {
    const page = await newE2EPage();

    await page.setContent('<ewc-media-controls></ewc-media-controls>');
    const element = await page.find('ewc-media-controls');
    expect(element).toHaveClass('hydrated');
  });
});
