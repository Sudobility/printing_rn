import { describe, expect, it, vi } from 'vitest';
import { renderPagesToPng } from '../src/render';

/** A fake Skia whose surfaces/images record that they were disposed. */
function fakeSkia() {
  const disposed = { surfaces: 0, images: 0 };
  let madeSurfaces = 0;
  const skia = {
    Color: (c: string) => c,
    Surface: {
      MakeOffscreen: (_w: number, _h: number) => {
        madeSurfaces++;
        return {
          getCanvas: () => ({ clear: vi.fn() }),
          makeImageSnapshot: () => ({
            encodeToBase64: () => 'PNGDATA',
            dispose: () => {
              disposed.images++;
            },
          }),
          dispose: () => {
            disposed.surfaces++;
          },
        };
      },
    },
  };
  return { skia, disposed, madeSurfaces: () => madeSurfaces };
}

describe('renderPagesToPng', () => {
  it('renders one white PNG per page and disposes every surface and snapshot', async () => {
    const f = fakeSkia();
    const drawn: number[] = [];
    const pages = await renderPagesToPng({
      skia: f.skia,
      pageCount: 3,
      pixelWidth: 3000,
      pixelHeight: 4000,
      pageWidth: 1000,
      pageHeight: 1333,
      drawPage: (_canvas, i) => drawn.push(i),
      yieldBetween: () => Promise.resolve(),
    });
    expect(pages).toEqual([
      { base64: 'PNGDATA', width: 1000, height: 1333 },
      { base64: 'PNGDATA', width: 1000, height: 1333 },
      { base64: 'PNGDATA', width: 1000, height: 1333 },
    ]);
    expect(drawn).toEqual([0, 1, 2]);
    expect(f.disposed.surfaces).toBe(3);
    expect(f.disposed.images).toBe(3);
  });

  it('abandons and returns null when cancelled, making no further surfaces', async () => {
    const f = fakeSkia();
    const pages = await renderPagesToPng({
      skia: f.skia,
      pageCount: 5,
      pixelWidth: 10,
      pixelHeight: 10,
      pageWidth: 10,
      pageHeight: 10,
      drawPage: () => {},
      isCancelled: () => true,
      yieldBetween: () => Promise.resolve(),
    });
    expect(pages).toBeNull();
    expect(f.madeSurfaces()).toBe(0);
  });

  it('throws if a surface cannot be made', async () => {
    const skia = {
      Color: (c: string) => c,
      Surface: { MakeOffscreen: () => null },
    };
    await expect(
      renderPagesToPng({
        skia,
        pageCount: 1,
        pixelWidth: 10,
        pixelHeight: 10,
        pageWidth: 10,
        pageHeight: 10,
        drawPage: () => {},
        yieldBetween: () => Promise.resolve(),
      })
    ).rejects.toThrow('Could not make a surface to print onto.');
  });
});
