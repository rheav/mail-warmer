import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mailwarmer.rheav.dev',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', 'pt-br': 'pt-BR' } },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
