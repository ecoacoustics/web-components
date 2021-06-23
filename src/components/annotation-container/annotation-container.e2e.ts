import { newE2EPage } from '@stencil/core/testing';

describe('annotation-container', () => {
  it('renders', async () => {
    const page = await newE2EPage();

    await page.setContent('<annotation-container></annotation-container>');
    const element = await page.find('annotation-container');
    expect(element).toHaveClass('hydrated');
  });

  it('renders changes to the name data', async () => {
    const page = await newE2EPage();

    await page.setContent('<annotation-container></annotation-container>');
    const component = await page.find('annotation-container');
    const element = await page.find('annotation-container >>> div');
    expect(element.textContent).toEqual(`Hello, World! I'm `);

    component.setProperty('first', 'James');
    await page.waitForChanges();
    expect(element.textContent).toEqual(`Hello, World! I'm James`);

    component.setProperty('last', 'Quincy');
    await page.waitForChanges();
    expect(element.textContent).toEqual(`Hello, World! I'm James Quincy`);

    component.setProperty('middle', 'Earl');
    await page.waitForChanges();
    expect(element.textContent).toEqual(`Hello, World! I'm James Earl Quincy`);
  });
});
