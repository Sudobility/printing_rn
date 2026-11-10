/**
 * The page-render loop: draw each page onto an offscreen Skia surface and take
 * a PNG, one page at a time, releasing each surface and snapshot before the
 * next.
 *
 * This is the memory-critical, reusable half of native printing, lifted out of
 * the app. A print page is ~3000×4000 px (a page's logical width × the print
 * scale), about 48 MB as a surface; left to the garbage collector a long score
 * held hundreds of MB of GPU memory until well after printing. Rendering every
 * page in one synchronous loop also froze the JS thread so nothing the reader
 * pressed could happen until it finished. So each surface and snapshot is
 * disposed as soon as its PNG is taken, and the loop yields between pages.
 *
 * Skia and the per-page draw are injected: the loop is generic over the canvas
 * type and never imports `@shopify/react-native-skia` or any score renderer, so
 * it stays domain- and dependency-free. The caller wraps the raw canvas with
 * its own 2D context (the app uses music_drawing's `createSkiaContext2D`) and
 * draws one page.
 */
import type { PrintablePage } from './page.js';

/** The subset of a Skia image the loop uses. */
export interface RenderImage {
  encodeToBase64(): string;
  dispose(): void;
}

/** The subset of a Skia offscreen surface the loop uses. */
export interface RenderSurface<C> {
  getCanvas(): C;
  makeImageSnapshot(): RenderImage;
  dispose(): void;
}

/** The subset of the Skia module the loop uses. */
export interface RenderSkia<C> {
  Surface: {
    MakeOffscreen(width: number, height: number): RenderSurface<C> | null;
  };
  Color(color: string): unknown;
}

export interface RenderPagesToPngOptions<
  C extends { clear(color: unknown): void },
> {
  /** The `@shopify/react-native-skia` module (or any structural match). */
  skia: RenderSkia<C>;
  pageCount: number;
  /** Backing-store size of each surface — the page's logical size × the print scale. */
  pixelWidth: number;
  pixelHeight: number;
  /** Logical page size reported to the print service (points), not the backing store. */
  pageWidth: number;
  pageHeight: number;
  /** Draw one page onto the raw canvas; the caller sets up its own scaled 2D context. */
  drawPage: (canvas: C, pageIndex: number) => void;
  /** Asked between pages; true abandons the render and resolves `null`. */
  isCancelled?: () => boolean;
  /** Lets a frame pass between pages so a spinner keeps turning. Defaults to `setTimeout(0)`. */
  yieldBetween?: () => Promise<void>;
}

/** One white PNG per page, or `null` if cancelled. Disposes every surface and snapshot. */
export async function renderPagesToPng<
  C extends { clear(color: unknown): void },
>(opts: RenderPagesToPngOptions<C>): Promise<PrintablePage[] | null> {
  const {
    skia,
    pageCount,
    pixelWidth,
    pixelHeight,
    pageWidth,
    pageHeight,
    drawPage,
    isCancelled = () => false,
    yieldBetween = () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
  } = opts;

  const rendered: PrintablePage[] = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    await yieldBetween();
    if (isCancelled()) return null;

    const surface = skia.Surface.MakeOffscreen(pixelWidth, pixelHeight);
    if (!surface) throw new Error('Could not make a surface to print onto.');
    try {
      const canvas = surface.getCanvas();
      // White, not transparent. A transparent PNG prints as whatever the print
      // service decides, which is not something to hand somebody's sheet music.
      canvas.clear(skia.Color('white'));
      drawPage(canvas, pageIndex);

      const image = surface.makeImageSnapshot();
      try {
        rendered.push({
          base64: image.encodeToBase64(),
          width: pageWidth,
          height: pageHeight,
        });
      } finally {
        image.dispose();
      }
    } finally {
      surface.dispose();
    }
  }
  return rendered;
}
