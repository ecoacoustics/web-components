import { newE2EPage } from '@stencil/core/testing';

describe('grid-lines-x', () => {
  it('renders', async () => {
    const page = await newE2EPage();

    await page.setContent('<grid-lines-x></grid-lines-x>');
    const element = await page.find('grid-lines-x');
    expect(element).toHaveClass('hydrated');
  });

  it('renders changes to the name data', async () => {
    const page = await newE2EPage();

    await page.setContent('<grid-lines-x></grid-lines-x>');
    const component = await page.find('grid-lines-x');
    const element = await page.find('grid-lines-x >>> div');
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
