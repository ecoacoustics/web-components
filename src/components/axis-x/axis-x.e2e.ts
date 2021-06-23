import { newE2EPage } from '@stencil/core/testing';

describe('axis-x', () => {
  it('renders', async () => {
    const page = await newE2EPage();

    await page.setContent('<axis-x></axis-x>');
    const element = await page.find('axis-x');
    expect(element).toHaveClass('hydrated');
  });

  it('renders changes to the name data', async () => {
    const page = await newE2EPage();

    await page.setContent('<axis-x></axis-x>');
    const component = await page.find('axis-x');
    const element = await page.find('axis-x >>> div');
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
