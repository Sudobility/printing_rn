import { describe, expect, it } from 'vitest';
import { isRasterPage, type PrintablePage } from '../src/page';

describe('isRasterPage', () => {
  it('is true for a raster page', () => {
    const page: PrintablePage = { base64: 'AAAA', width: 100, height: 200 };
    expect(isRasterPage(page)).toBe(true);
  });

  it('is false for a vector page', () => {
    const page: PrintablePage = { svg: '<svg/>', width: 100, height: 200 };
    expect(isRasterPage(page)).toBe(false);
  });
});
