# style-test

Step 3 of the channel setup: the same 8-second scene drawn in four looks, to
pick one look for every video. The scene is a map of the raid route from
Norway to Lindisfarne, then a longship off the monastery, with the same
Kokoro line (bm_george) each time.

| Look | Feel |
| --- | --- |
| A · Parchment & ink | Old chronicle or map: vellum, ink line work, red accents, EB Garamond |
| B · Stitched tapestry | Wool on linen: stitched outlines, inscription band, border frieze |
| C · Paper cut-out | Layered card with soft shadows, teal, sand and coral, Outfit type |
| D · Night documentary | Dark and cinematic: glowing lines, silhouettes, letterbox bars, Inter type |

- `renders/style-test.mp4`: all four, one after another (32 s).
- `renders/style-test-compare.jpg`: the map and the scene from each look, side by side.

## How it's built

- `tools/map-data.mjs`: projects Natural Earth coastlines (`world-atlas`) for
  the North Sea and writes `map-data.json`, including the route.
- `tools/make-textures.cjs`: renders the vellum, linen and card textures in
  `assets/` (needs Playwright; run once).
- `tools/build-looks.mjs`: writes `compositions/look-*.html` and `index.html`.
  Edit it, not the generated files, then run `node tools/build-looks.mjs`.

Then `npx hyperframes check` and `npx hyperframes render -o renders/style-test.mp4`.
