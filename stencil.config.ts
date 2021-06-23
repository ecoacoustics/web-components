import { Config } from '@stencil/core';

const config: Config = {
  namespace: 'ewc',
  globalStyle: 'src/global/global.css',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements-bundle',
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
    },
  ],
  testing: {
    // testEnvironment: 'jsdom',
  },
};

module.exports = { config };
