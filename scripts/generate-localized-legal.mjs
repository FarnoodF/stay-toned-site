import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://staytoned.farnood.tech';
const locales = {
  'es-419': { translate: 'es', label: 'Español (Latinoamérica)', dir: 'ltr' },
  'pt-BR': { translate: 'pt', label: 'Português (Brasil)', dir: 'ltr' },
  de: { translate: 'de', label: 'Deutsch', dir: 'ltr' },
  fr: { translate: 'fr', label: 'Français', dir: 'ltr' },
  ja: { translate: 'ja', label: '日本語', dir: 'ltr' },
  ko: { translate: 'ko', label: '한국어', dir: 'ltr' },
  ar: { translate: 'ar', label: 'العربية', dir: 'rtl' },
  it: { translate: 'it', label: 'Italiano', dir: 'ltr' },
  id: { translate: 'id', label: 'Bahasa Indonesia', dir: 'ltr' },
  'hi-IN': { translate: 'hi', label: 'हिन्दी', dir: 'ltr' },
  'fa-IR': { translate: 'fa', label: 'فارسی', dir: 'rtl' },
  tr: { translate: 'tr', label: 'Türkçe', dir: 'ltr' },
  pl: { translate: 'pl', label: 'Polski', dir: 'ltr' },
};
const pages = ['policy', 'terms'];
const translationSeparator = '__STAY_TONED_LEGAL_SEPARATOR__';

for (const page of pages) {
  const sourcePath = resolve(siteRoot, page, 'index.html');
  const sourceDom = new JSDOM(await readFile(sourcePath, 'utf8'));
  sourceDom.window.document.documentElement.lang = 'en';
  sourceDom.window.document.documentElement.dir = 'ltr';
  addLocaleDiscovery(sourceDom.window.document, 'en', page, '../');
  await writeFile(
    sourcePath,
    `<!doctype html>\n${sourceDom.window.document.documentElement.outerHTML}\n`.replace(/[ \t]+$/gm, ''),
  );
}

async function translateValue(value, targetLanguage, attempt = 0) {
  const response = await fetch('https://translate.googleapis.com/translate_a/single', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client: 'gtx', sl: 'en', tl: targetLanguage, dt: 't', q: value }),
  });
  if (response.status === 429 && process.env.ALLOW_ENGLISH_LEGAL_FALLBACK !== '1' && attempt < 5) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000 * (attempt + 1)));
    return translateValue(value, targetLanguage, attempt + 1);
  }
  if (!response.ok) throw new Error(`Translation request failed (${response.status}).`);
  const result = await response.json();
  return result[0]
    .map((part) => part[0])
    .join('')
    .trim();
}

async function translateValues(values, targetLanguage) {
  const translated = [];
  let batch = [];
  let batchLength = 0;
  const batches = [];
  for (const value of values) {
    const addedLength = value.length + translationSeparator.length + 2;
    if (batch.length > 0 && batchLength + addedLength > 3500) {
      batches.push(batch);
      batch = [];
      batchLength = 0;
    }
    batch.push(value);
    batchLength += addedLength;
  }
  if (batch.length > 0) batches.push(batch);

  for (const valuesBatch of batches) {
    const result = await translateValue(valuesBatch.join(`\n${translationSeparator}\n`), targetLanguage);
    const parts = result.split(new RegExp(`\\s*${translationSeparator}\\s*`, 'g'));
    if (parts.length !== valuesBatch.length) {
      throw new Error(`Translation separator mismatch for ${targetLanguage}.`);
    }
    translated.push(...parts.map((value) => value.trim()));
  }
  return translated;
}

function addLocaleDiscovery(document, locale, page, pathPrefix) {
  for (const element of document.querySelectorAll('link[rel="canonical"], link[rel="alternate"], .language-nav')) {
    element.remove();
  }

  const pageUrl = locale === 'en' ? `${origin}/${page}/` : `${origin}/${locale}/${page}/`;
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = pageUrl;
  document.head.append(canonical);
  const alternates = [
    ['en', `${origin}/${page}/`],
    ...Object.keys(locales).map((tag) => [tag, `${origin}/${tag}/${page}/`]),
  ];
  for (const [tag, href] of alternates) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = tag;
    link.href = href;
    document.head.append(link);
  }
  const fallback = document.createElement('link');
  fallback.rel = 'alternate';
  fallback.hreflang = 'x-default';
  fallback.href = `${origin}/${page}/`;
  document.head.append(fallback);

  const languageNav = document.createElement('nav');
  languageNav.className = 'site-legal-links language-nav';
  languageNav.setAttribute('aria-label', 'Language');
  languageNav.innerHTML = [
    locale === 'en'
      ? '<span aria-current="page">English</span>'
      : `<a href="${pathPrefix}${page}/" hreflang="en">English</a>`,
    ...Object.entries(locales).map(([tag, config]) =>
      tag === locale
        ? `<span aria-current="page">${config.label}</span>`
        : `<a href="${pathPrefix}${tag}/${page}/" hreflang="${tag}">${config.label}</a>`,
    ),
  ].join('<span aria-hidden="true"> · </span>');
  document.querySelector('.site-footer')?.append(languageNav);
}

function localizeLinks(document, locale, page) {
  for (const element of document.querySelectorAll('[href], [src]')) {
    for (const attribute of ['href', 'src']) {
      const value = element.getAttribute(attribute);
      if (!value || /^(https?:|mailto:|#)/.test(value)) continue;
      if (value.startsWith('../assets/'))
        element.setAttribute(attribute, `../../assets/${value.slice('../assets/'.length)}`);
      else if (value === '../') element.setAttribute(attribute, '../../');
      else if (value === './') element.setAttribute(attribute, './');
      else if (value === '../policy/') element.setAttribute(attribute, page === 'policy' ? './' : '../policy/');
      else if (value === '../terms/') element.setAttribute(attribute, page === 'terms' ? './' : '../terms/');
      else if (value === '../contact/') element.setAttribute(attribute, '../../contact/');
    }
  }

  addLocaleDiscovery(document, locale, page, '../../');
}

for (const page of pages) {
  const sourcePath = resolve(siteRoot, page, 'index.html');
  const source = await readFile(sourcePath, 'utf8');
  for (const [locale, config] of Object.entries(locales)) {
    const outputPath = resolve(siteRoot, locale, page, 'index.html');
    if (process.env.REGENERATE_LEGAL_LOCALES !== '1') {
      try {
        await access(outputPath);
        const existing = await readFile(outputPath, 'utf8');
        if (!existing.includes('English fallback awaiting translation')) continue;
      } catch {
        // Missing locale: generate it below.
      }
    }
    const dom = new JSDOM(source);
    const { document, NodeFilter } = dom.window;
    document.documentElement.lang = locale;
    document.documentElement.dir = config.dir;
    localizeLinks(document, locale, page);

    const items = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script, style, svg, .language-nav')) continue;
      const value = node.nodeValue?.replace(/\s+/g, ' ').trim();
      if (value && /[A-Za-z]/.test(value) && value !== 'StayToned' && !value.includes('@')) {
        items.push({ node, value, kind: 'text' });
      }
    }
    for (const element of document.querySelectorAll('[aria-label], meta[name="description"]')) {
      const attribute = element.matches('meta') ? 'content' : 'aria-label';
      const value = element.getAttribute(attribute);
      if (value && /[A-Za-z]/.test(value)) items.push({ node: element, value, kind: attribute });
    }
    const values = [document.title, ...items.map((item) => item.value)];
    let translated;
    let usedEnglishFallback = false;
    try {
      translated = await translateValues(values, config.translate);
    } catch (error) {
      if (process.env.ALLOW_ENGLISH_LEGAL_FALLBACK !== '1') throw error;
      translated = values;
      usedEnglishFallback = true;
    }
    document.title = translated[0];
    items.forEach((item, index) => {
      if (item.kind === 'text') item.node.nodeValue = translated[index + 1];
      else item.node.setAttribute(item.kind, translated[index + 1]);
    });

    await mkdir(dirname(outputPath), { recursive: true });
    const output = `<!doctype html>\n<!-- ${
      usedEnglishFallback
        ? 'English fallback awaiting translation. Qualified legal and fluent review required before release.'
        : 'Machine-drafted localization. Qualified legal and fluent review required before release.'
    } -->\n${document.documentElement.outerHTML}\n`;
    await writeFile(outputPath, output.replace(/[ \t]+$/gm, ''));
  }
}

process.stdout.write(`Generated ${Object.keys(locales).length * pages.length} localized legal pages.\n`);
