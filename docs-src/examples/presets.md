---
layout: layouts/default.11ty.js
title: Open Ecoacoustics Web Components | Spectrogram Presets
---

## Spectrogram Presets

<div class="example-grid"></div>

<script>
(() => {
    const exampleSpectrograms = [
        "<oe-spectrogram src='/public/example_34s.flac' color-map='audacity'></oe-spectrogram>",
        "<oe-spectrogram src='/public/example_34s.flac' color-map='magma' contrast='2.5' brightness='-0.4'></oe-spectrogram>",
        "<oe-spectrogram src='/public/example_34s.flac' color-map='cubeHelix' contrast='2.2' brightness='-0.4'></oe-spectrogram>",
        "<oe-spectrogram src='/public/merged_diagnostic.wav' color-map='audacity' window-size='256'></oe-spectrogram>",
        "<oe-spectrogram src='/public/merged_diagnostic.wav' color-map='audacity' window-size='1024'></oe-spectrogram>",
        "<oe-spectrogram src='/public/merged_diagnostic.wav' color-map='audacity' window-size='2048'></oe-spectrogram>",
        "<oe-spectrogram src='/public/example2.flac' color-map='audacity'></oe-spectrogram>",
        "<oe-spectrogram src='/public/example2.flac' color-map='turbo' window-size='1024' window-function='lanczos'></oe-spectrogram>",
        "<oe-spectrogram src='/public/example2.flac' color-map='turbo' window-size='256' window-function='lanczos'></oe-spectrogram>",
    ];

    /**
     * @param {String} template
     * @returns {String} escapedTemplate
     */
    function escapeTemplate(template) {
        return template
            .replace(/&/g, "&amp")
            .replace(/</g, "&lt")
            .replace(/>/g, "&gt")
            .replace(/\)/g, "&#41")
            .replace(/{/g, "&#123")
            .replace(/}/g, "&#125");
    }

    /**
     * @param {String} template
     * @returns {HTMLElement}
     */
    function ExampleCard(template) {
        const element = document.createElement("div");
        element.className = "grid-item";

        const exampleTemplate = escapeTemplate(template);

        console.log(exampleTemplate);

        element.innerHTML = `
            <code>${exampleTemplate}</code>
            ${template}
        `;

        return element;
    }

    function init() {
        const outputElement = document.getElementsByClassName("example-grid")[0];

        exampleSpectrograms.forEach((template) => {
            const element = ExampleCard(template);
            outputElement.appendChild(element);
        });
    }

    window.onload = () => {
        init();
    };
})();
</script>

<style>
    oe-spectrogram {
        position: relative;
        width: 100%;
        height: 400px;
    }

    code {
        display: block;
        padding: 1rem;
        background-color: var(--bs-dark);
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
    }

    .example-grid {
        display: flex;
        flex-wrap: wrap;
        flex: 1;

        & > * {
            padding: 1rem;
        }
    }

    .grid-item {
        position: relative;
        width: calc(33.3% - 2rem);
        border: solid 1px rgba(0, 0, 0, 0.2);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-radius: 16px;
        margin: 1rem;
    }
</style>
