# BioDigital respiratory viewer

## Run

From the project directory, run `npm run dev`, then open:

`http://localhost:3000/view?id=production/femaleAdult/female_system_respiratory_20&lang=en`

The homepage (`/`) also opens the same model. This project runs locally without a BioDigital login or runtime connection to its renderer.

### Open from a phone on the same Wi-Fi

`npm run dev` listens on all local interfaces. Open the computer's Wi-Fi address on the phone, for example `http://192.168.1.101:3000/view`; `localhost` on the phone points to the phone itself. `next.config.ts` adds this computer's current IPv4 interface addresses to `allowedDevOrigins`, so Next.js can serve its development resources when accessed over the LAN. Restart the dev server after changing networks or IP addresses.

`node scripts/check-lan-loading.mjs` verifies that the LAN URL hydrates, creates the 3D canvas, finishes loading, and supports anatomy search at a mobile viewport. The before/after results are `lan-loading-before.json` and `lan-loading-after.json`, with screenshots in `../../design-references/biodigital/`. Before allowing the LAN address, the page remained on the loading state with no canvas; afterward, the model and controls loaded without failed HTTP responses or runtime errors.

## Route and file ownership

| Source | Local route | Implementation |
| --- | --- | --- |
| https://human.biodigital.com/view?id=production/femaleAdult/female_system_respiratory_20&lang=en | `/view?id=production/femaleAdult/female_system_respiratory_20&lang=en`, also `/` | `src/app/view/page.tsx`, `src/app/page.tsx`, `src/components/sites/biodigital/` |

`viewer.tsx` owns the interface and UI state; `anatomy-scene.tsx` owns the editable Three.js scene, camera, selection and layer visibility; `viewer.css` scopes the source styling. The original template homepage was replaced. No other authored pages existed.

## Source evidence

Inspected the live source in Edge at 1440 × 900 and 390 × 844 using a normal browser user agent. The server responds to the default headless user agent with an empty metadata page, so that response was not used as the visual reference.

Desktop: 56px dark header, 320px white information column, 42px tools, pale gray full-height viewer, centered watermark, bottom-right camera controls. Source font: Inter Variable. The initial view includes a dismissible signup sheet, 256px tall on desktop and 308px on mobile. Mobile replaces the sidebar with a title/info control.

Observed states: signup open and dismissed; information column expanded/collapsed; Select/Hide/Fade menu; anatomy layer sliders; anatomy search/list; drawing mode; More Options → Help. Screenshots are in `../../design-references/biodigital/`. `states.json` records source text in these states. `source.html`, `desktop-dom.html` and `network.json` preserve inspection evidence, not executable dependencies.

## Local assets

All runtime assets live under `public/sites/biodigital/`. The renderer uses `respiratory-color.png`, `respiratory-normal.png` and `respiratory-roughness.png`, converted from the source DDS atlases by `node scripts/prepare-biodigital-textures.mjs`. These 1024px PNGs work without S3TC/DXT GPU extensions and reduce GPU memory use on phones. DDS files are retained as conversion inputs only. The scene waits for all three image textures and model data before dismissing its loading state; failed texture downloads display the existing retry message.

| Asset | Source |
| --- | --- |
| `anatomy.json` | 87 mesh instances extracted from geometry delivered to the public source viewer, preserving mirrored transforms and quantized position/UV decoding |
| `respiratory-color.dds` | `https://human.biodigital.com/content/states/human_20_female_respiratory_system/materials/materials/images/bd_atlas_respiratory_system_color_atlas_txt-dxt1.dds` |
| `respiratory-normal.dds` | Same directory, `bd_atlas_respiratory_system_normal_atlas_txt-dxt1.dds` |
| `respiratory-roughness.dds` | Same directory, `bd_atlas_respiratory_system_roughness_atlas_txt-dxt1.dds` |
| `inter-variable.woff2` | `https://human.biodigital.com/InterVariable.0336a89fb4e7fc1d.woff2` |
| `fa-solid-900.woff2` | `https://human.biodigital.com/fa-solid-900.d8af896e2cdfba50.woff2` |
| `biodigital-logo-white.svg` | `https://human.biodigital.com/assets/shared/images/biodigital-logo-white.svg` |
| `powered-by.svg` | Same directory, `powered-by-biodigital-anatomage-gray-transparent.svg` |
| `powered-by-color.svg` | Same directory, `powered-by-biodigital-anatomage-color.svg` |
| `respiratory-preview.jpg` | Source Open Graph preview: `https://human.biodigital.com/media/images/77bd6567-d52a-4df7-886b-bcf54888c110/large/image.jpg`; retained as a reference, not used as the viewer |

The DDS responses are gzip streams; the saved source files have been decompressed and checked for their DDS signature before PNG conversion. Source SVGs and fonts were downloaded directly. Geometry is rendered locally, with no embedded source iframe or downloaded application bundle. BioDigital and Anatomage attribution remains visible; these source assets remain their owners' content.

`scripts/extract-biodigital.mjs` captures the publicly rendered geometry. `scripts/prepare-biodigital-model.mjs` decodes it into the local scene asset. `model-raw.json` is the extraction input. Extraction scripts do not access account credentials or private content.

## Checks and comparisons

`npm run check` runs ESLint, TypeScript and a production build. `scripts/check-biodigital.mjs` exercises the rendered local viewer at 1440 × 900, 1920 × 1080 and 390 × 844. Its latest result is recorded in `browser-check.json`.

Browser checks cover loading, signup dismissal, search filtering, selection, layer opacity, camera reset, actual orbit input changing the canvas, drawing/undo, mobile information panel, console/page errors and horizontal overflow. Browser automation uses the locally installed Edge and Playwright in `%TEMP%/biodigital-browser-tools`; install tooling there with `npm install --prefix "$env:TEMP\biodigital-browser-tools" playwright --no-audit --no-fund` if needed. Start the dev server, then run `node scripts/check-biodigital.mjs`.

See `../../design-references/biodigital/comparison.html` for source/local desktop and mobile views.

### Mobile texture regression

Run `node scripts/check-mobile-textures.mjs` against the running localhost dev server. It disables S3TC extensions in both WebGL contexts, checks the rendered canvas for colored respiratory anatomy, checks for runtime errors, and aborts a texture download to verify the retry message. This tests the GPU capability difference that viewport-only mobile emulation missed. The result and screenshot are `mobile-textures-after.json` and `../../design-references/biodigital/mobile-no-s3tc-after.png`. This simulated check does not replace testing on the user's physical phone after deployment.

## Remaining differences

- Three.js recreates the public model's initial camera and geometry. BioDigital's proprietary lighting, x-ray material, smooth normals and selection presentation are approximated; this is not an exact renderer replacement.
- The local scene includes the loaded respiratory structures and body surface. It does not include the source platform's full anatomy catalog, additional organ-system loading, account features, cloud storage or model library.
- Fine anatomy search labels select their nearest available parent mesh group. Mesh names are derived from geometry location, not BioDigital's full structure metadata; this recreation is not a clinical reference.
- Drawing supports pen color/width, undo, clear and SVG annotation export. Source text annotations and screenshot copy are not reproduced. Exported SVG contains annotations, not a composite anatomy screenshot.
- Signup, signin, Learn More and brand/help destinations remain external links. Only the requested respiratory model is mapped locally; other `id` values do not load additional models.
