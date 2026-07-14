/**
 * Wix's media CDN (static.wixstatic.com) supports on-the-fly resizing and
 * compression via URL parameters, but migrated posts store the bare,
 * un-resized URL. Every card/thumbnail across the site was loading the
 * FULL ORIGINAL image regardless of display size — a real mobile
 * performance cost multiplied across every post card on every page.
 *
 * This appends Wix's fill/resize parameters so their CDN serves an
 * appropriately-sized, compressed image instead.
 */
export function wixResizedUrl(url: string, width: number, height: number, quality = 80): string {
  if (!url.includes("static.wixstatic.com/media/")) return url; // not a Wix image, leave as-is

  const match = url.match(/static\.wixstatic\.com\/media\/([^/]+)/);
  if (!match) return url;
  const mediaId = match[1];

  return `https://static.wixstatic.com/media/${mediaId}/v1/fill/w_${width},h_${height},al_c,q_${quality},usm_0.66_1.00_0.01,enc_auto/${mediaId}`;
}
