// TODO:  Temporary declaration file until TypeScript supports following Intl.Locale features

declare namespace Intl {
  // function getCanonicalLocales(locales: string | string[]): string[];

  interface Locale extends LocaleOptions {
    timeZones: string[];
  }
}
