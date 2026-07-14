import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://samleemuzik.com",
  output: "server",
  adapter: cloudflare({
    imageService: "compile"
  }),
  vite: {
    ssr: {
      external: ["node:async_hooks"]
    }
  }
});

