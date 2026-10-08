export const languages = ['en', 'fa'] as const;
export type Lang = (typeof languages)[number];
export const defaultLang: Lang = 'en';
export const dir: Record<Lang, 'ltr' | 'rtl'> = { en: 'ltr', fa: 'rtl' };
export const locale: Record<Lang, string> = { en: 'en_US', fa: 'fa_IR' };
export const isLang = (v: string | undefined): v is Lang => v === 'en' || v === 'fa';

/** `/en/about/` style path for a language-relative route (`''` = home). */
export function lp(lang: Lang, route = ''): string {
  const clean = route.replace(/^\/+|\/+$/g, '');
  return clean ? `/${lang}/${clean}/` : `/${lang}/`;
}

/** Date for display; Persian uses the Jalali calendar with Latin digits kept readable. */
export function fmtDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-GB', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(date);
}
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Words per minute differs little; Persian counted on whitespace tokens too. */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
