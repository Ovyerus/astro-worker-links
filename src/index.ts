import type { AstroConfig, AstroIntegration } from "astro";
import { ofetch } from "ofetch";
import { ZodError } from "zod";
import { Logger } from "./logger";
import { optionsSchema } from "./schema";

type Promisable<T> = Promise<T> | T;
type PageMapping = Array<{ page: string; shortlink: string }>;

interface WorkerLinksOptions {
  domain: string;
  secret: string;
  getPageMapping(pages: URL[]): Promisable<PageMapping>;
}

function formatConfigErrorMessage(err: ZodError) {
  const errorList = err.issues.map(
    (issue) => ` ${issue.path.join(".")}  ${issue.message + "."}`
  );
  return "Invalid config\n" + errorList.join("\n");
}

const PKG_NAME = "astro-worker-links";

const createPlugin = (options?: WorkerLinksOptions): AstroIntegration => {
  let config: AstroConfig;

  return {
    name: PKG_NAME,
    hooks: {
      "astro:config:done": async ({ config: cfg }) => {
        config = cfg;
      },
      "astro:build:done": async ({ pages }) => {
        const logger = new Logger(PKG_NAME);
        let opts: WorkerLinksOptions;

        try {
          opts = optionsSchema.parse(options);
        } catch (err) {
          if (err instanceof ZodError) {
            logger.error(formatConfigErrorMessage(err));
            return;
          } else {
            throw err;
          }
        }

        if (!config.site) {
          logger.warn("requires the `site` astro.config option. Skipping.");
          return;
        }

        logger.info(`Creating worker links on ${opts.domain}`);

        const siteRoot = new URL(config.base, config.site);
        const pageUrls = pages.map((p) => new URL(p.pathname, siteRoot));
        let pageMapping: PageMapping;

        try {
          pageMapping = await opts.getPageMapping(pageUrls);
        } catch (err) {
          return logger.error("Error while getting page mapping:", err as any);
        }

        if (!pageMapping.length)
          return logger.warn("Empty page mapping generated. Skipping");

        for (const entry of pageMapping) {
          const url = new URL(entry.shortlink.replace(/\/$/, ""), opts.domain);
          await ofetch(url.href, {
            method: "PUT",
            headers: { Authorization: opts.secret, URL: entry.page },
          });
        }

        logger.success(`Created ${pageMapping.length} worker links!`);
        // TODO: map of shortlink to page
      },
    },
  };
};

export default createPlugin;
