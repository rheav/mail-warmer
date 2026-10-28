import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Entries are "<lang>/<slug>" (e.g. "en/privacy"), lang in en | pt-br.
const legal = defineCollection({
  loader: glob({ pattern: "*/*.md", base: "./src/content/legal" }),
  schema: z.object({
    title: z.string(),
    accent: z.string(), // last word of the title, drawn in blue
    description: z.string().max(160),
    updated: z.string(),
  }),
});

// Docs: "<lang>/<slug>"; "index" is /docs itself. `order` drives the sidebar and prev/next.
const docs = defineCollection({
  loader: glob({ pattern: "*/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    nav: z.string(),
    order: z.number().int(),
  }),
});

export const collections = { legal, docs };
