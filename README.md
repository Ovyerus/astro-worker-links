# astro-worker-links

Automatically create [worker-links](https://github.com/erisa/worker-links)
redirects for your [Astro](https://astro.build/) pages at build time!

Better docs will come soon, it's late rn and I'm just getting this out the door.

## Example usage

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import workerLinks from "astro-worker-links";

// https://astro.build/config
export default defineConfig({
  integrations: [
    // ...
    workerLinks({
      domain: "https://my-worker-links.example.com",
      secret: process.env.WORKER_LINKS_SECRET,
      // Pages is an array of all the built pages from your project as URLs
      getPageMapping(pages) {
        // Filter to only generate links for pages matching `/blog/[id]` anywhere in them (but not the index page)
        return pages
          .filter(
            (url) => url.pathname !== "/blog/" && url.pathname.includes("/blog")
          )
          .map((url) => {
            return {
              page: url.href,
              // Strip the `/blog` intermediate part so that short links are just `example.com/blog-post-name` instead of `example.com/blog/blog-post-name`
              shortlink: url.pathname.replace("/blog", ""),
            };
          });
      },
    }),
  ],
  // ...
});
```

you can also provide an async function for `getPageMapping` if you need to fetch
external data

```js
export default defineConfig({
  integrations: [
    // ...
    workerLinks({
      // ...
      async getPageMapping(pages) {
        const results = await Promise.all(
          pages.map(async (url) => {
            const resource = await fetch(...);
            return {
              page: url.href,
              shortlink: resource.id, // or whatever
            };
          })
        );

        return results;
      },
    }),
  ],
});
```

Or you can just return a static object from the function

```js
export default defineConfig({
  integrations: [
    // ...
    workerLinks({
      // ...
      getPageMapping() {
        return [
          {
            page: "https://really-long-site.example.com/blog/my-awesome-post-please-read-it",
            shortlink: "/my-awesome-post",
          },
          {
            page: "https://really-long-site.example.com/about-us",
            shortlink: "/about",
          },
        ];
      },
    }),
  ],
});
```

## License

The source code in this repository is licensed under the
[MIT License](./LICENSE).
