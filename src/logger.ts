/**
 * Inspired by the logger from some official Astro integrations.
 * https://github.com/withastro/astro/blob/main/packages/integrations/sitemap/src/utils/logger.ts
 */
import { blue, Color, green, red, yellow } from "colorette";

export class Logger {
  readonly #packageName: string;

  constructor(packageName: string) {
    this.#packageName = packageName;
  }

  #log(msg: string, color: Color, colorOnlyPackageName = false) {
    const fn = colorOnlyPackageName ? (i: any) => i : color;
    console.log(`${color(`${this.#packageName}:`)} ${fn(msg)}`);
  }

  info(msg: string) {
    this.#log(msg, blue, true);
  }

  success(msg: string) {
    this.#log(msg, green, true);
  }

  warn(msg: string) {
    this.#log(msg, yellow);
  }

  error(msg: string, error?: unknown) {
    const err =
      error instanceof Error
        ? `${error.message}\n${error.stack}`
        : (error as any);
    const m = err ? `${msg}\n${err}` : msg;
    this.#log(m, red);
  }
}
