/**
 * React Native printing surface (`@sudobility/printing_rn`).
 *
 * RN prints *baked pages* — one PNG (raster) or SVG (vector, on Windows) per
 * page, handed to an OS print service. Phase 0 scaffold: the page currency type
 * and a guard the native bridge needs. The Skia page-render loop
 * (`renderPagesToPng`), the delivery helper (`printRenderedPages`), and the
 * relocated native module arrive in Phase 2 (see
 * `music_app/docs/printing-libraries.md`).
 */

/** A rasterized page (iOS / macOS / Android). */
export interface PrintablePageRaster {
  base64: string;
  width: number;
  height: number;
}

/** A vector page (the Windows WebView2 PDF bridge). */
export interface PrintablePageVector {
  svg: string;
  width: number;
  height: number;
}

/** One page handed to the platform print service. */
export type PrintablePage = PrintablePageRaster | PrintablePageVector;

/** True when a page carries raster (PNG) data rather than vector (SVG). */
export function isRasterPage(page: PrintablePage): page is PrintablePageRaster {
  return 'base64' in page;
}
