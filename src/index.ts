import type { AstroConfig, AstroIntegration } from "astro";
import { ofetch } from "ofetch";
import { ZodError } from "zod";
import { Logger } from "./logger.js";
import { optionsSchema } from "./schema.js";
import { gray, magenta } from "colorette";

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
  const logger = new Logger(PKG_NAME);

  return {
    name: PKG_NAME,
    hooks: {
      "astro:config:done": async ({ config: cfg }) => {
        config = cfg;
      },
      "astro:build:done": async ({ pages }) => {
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

        const body = Object.fromEntries(
          pageMapping.map((p) => [p.shortlink.replace(/\/$/, ""), p.page])
        );
        let result: any;

        try {
          result = await ofetch(opts.domain, {
            method: "POST",
            headers: {
              Authorization: opts.secret,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
        } catch (err) {
          if (!(err as any).data) {
            logger.error("Failed to create new shortlinks", err);
          }
          logger.error(
            `Failed to create new shortlinks:\n${JSON.stringify(
              (err as any).data,
              null,
              2
            )}`
          );
          return;
        }

        const resultMap = result.entries
          .map(
            (e: { key: string; shorturl: string; longurl: string }) =>
              `  ${magenta(`/${e.key}`)}\n    ${gray("->")} ${e.longurl}`
          )
          .join("\n");
        logger.success(
          `Created ${pageMapping.length} worker links on ${opts.domain}!\n${resultMap}\n`
        );
      },
    },
  };
};

export default createPlugin;
