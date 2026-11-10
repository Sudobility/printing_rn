# @sudobility/printing_rn

React Native printing for `@sudobility` apps. RN prints baked pages — one PNG
(raster) or SVG (vector, on Windows) per page — handed to an OS print service.
This library owns the Skia page-render loop, the delivery helper, and the native
print module. Built on `@sudobility/printing_core`.

> **Phase 0 scaffold.** This package currently ships only the `PrintablePage`
> type and the `isRasterPage` guard. The Skia render loop (`renderPagesToPng`),
> the delivery helper (`printRenderedPages`), and the relocated native module
> land in Phase 2. See the design doc at
> `music_app_rn/docs/printing-libraries.md`.

## Install

```sh
bun add @sudobility/printing_rn
```
