// Temporary declaration file until TypeScript supports latest Intl

declare namespace Intl {
  function getCanonicalLocales(locales: string | string[]): string[];

  interface Locale extends LocaleOptions {
    timeZones: string[];
  }
}