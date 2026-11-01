import type { Lang } from "./lib/i18n/core";

declare global {
  namespace App {
    interface Locals {
      /** UI language resolved from the `lang` cookie or `Accept-Language`. */
      lang: Lang;
    }
  }
}

export {};
