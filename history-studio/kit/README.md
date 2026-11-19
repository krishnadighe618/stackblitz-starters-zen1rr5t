# The channel's tapestry kit

The stitched tapestry look (look B in `../style-test`), as code every video
reuses. Scenes are drawn, not generated, so they stay in one style.

| File | What it has |
| --- | --- |
| `tapestry.mjs` | Palette (madder, woad, weld, olive on linen), stitched outlines, satin texture, and drawn pieces: people (Swedish blue, Danish red, townsfolk), horses and riders, cannons, 17th-century ships and boats with flags, castle, town, church, star fort, walls, tents, fires, lanterns, tables, crowns, thrones, sea, ice, snow, shores, trees, a modern bridge, the border frieze |
| `maps.mjs` | Tapestry maps from Natural Earth (`world-atlas`): any frame, kingdom colours, provinces cut out by lon/lat polygons, stitched borders and coasts, labels, pins, and routes that draw on with an army banner riding them |
| `film.mjs` | Turns a video's shot list into a HyperFrames project: one scene per shot, the inscription band and frieze over the whole film, the narration, and events timed to the exact word the narrator says |

A video uses it from its own `tools/build-film.mjs` (see
`../frozen-sea-1658/tools/build-film.mjs`): each shot names the paragraph it
starts on, its inscription, what to draw, and what moves when.

Colours stay meaningful across videos: Sweden is woad blue and weld yellow,
Denmark is madder red and linen. New kingdoms get their own pair.
