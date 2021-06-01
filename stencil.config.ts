import { Config } from '@stencil/core';

const config: Config = {
  namespace: 'listen-and-annotate',
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
