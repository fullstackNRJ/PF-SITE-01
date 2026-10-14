// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';
import tailwindcss from '@tailwindcss/vite';

import { createSafeMarkdownPlugin } from './src/lib/markdown/safe-markdown.ts';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  markdown: {
    // Post bodies are injected into the page, so every document passes through
    // the policy in src/lib/markdown/safe-markdown.ts. The factory form gives
    // each document its own plugin state (heading-id de-duplication).
    processor: satteri({ hastPlugins: [() => createSafeMarkdownPlugin()] }),
    shikiConfig: {
      transformers: [
        {
          // Shiki makes code blocks focusable so they can scroll sideways. They
          // wrap instead (see .markdown pre), so the tab stop would lead nowhere.
          pre(node) {
            delete node.properties.tabindex;
          },
        },
      ],
    },
  },

  vite: {
    plugins: [tailwindcss()]
  }
});