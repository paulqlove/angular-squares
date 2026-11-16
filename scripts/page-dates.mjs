// Sitemap <lastmod> per page. Dates live in scripts/page-dates.json: when you
// change a page's content, set its date there. "/team/*" covers every team page.
// Blog posts use their front-matter date.

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function lastmodFor(urlPath, pageDates, postDates = new Map()) {
  const date = postDates.get(urlPath)
    ?? pageDates[urlPath]
    ?? (urlPath.startsWith('/team/') ? pageDates['/team/*'] : undefined);
  if (!date || !isoDate.test(date)) {
    throw new Error(`No sitemap date for "${urlPath}". Add it to scripts/page-dates.json.`);
  }
  return date;
}
