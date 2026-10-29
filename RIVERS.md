# There Are Rivers in the Sky

A playable, self-contained browser prototype of the Lotus Sanctuary chapter. The landscape uses a procedural Canvas renderer with perspective projection; this is an exploration and interaction prototype, not a full 3D engine.

## Download

Download the [standalone game ZIP](https://github.com/bluefinsia/bluefinsia.github.io/raw/refs/heads/rivers-in-the-sky-prototype/downloads/rivers-in-the-sky.zip), extract it, and open `index.html` in your browser. The ZIP includes only the game and brief play instructions. If prompted, sign in to GitHub with access to this repository.

## Open the game

`index.html` is a standalone game: its styles and JavaScript are embedded, and it makes no external asset requests. You can download the file and open it in a browser with JavaScript enabled. Some file viewers only display HTML and block scripts; use a browser or the local server in that case.

For development, run this command from the repository:

```sh
python3 -m http.server 5501 --bind 127.0.0.1
```

Open the server's root page in a browser. No package installation is needed. System fonts work offline.

When editing `rivers.css` or `rivers.js`, refresh the embedded assets with `python3 scripts/build_rivers.py`. Commit the updated `index.html` alongside those source files. The build uses only the Python standard library and can be repeated safely.

## Play

- Begin your journey. WASD moves; left/right arrows turn the view.
- Select Camera with 2 or the toolbar, then click the glowing lotus left of the path. Close the specimen journal.
- Select Water staff with 3, then click the golden sluice wheel right of the path.
- Click the glowing archive echo under the central gate and choose a response.
- Use 1 for exploration, J for the journal, and Escape to close an open panel. Touch users can select tools and tap the same discoveries to finish the chapter without moving.
- The sound button enables a quiet synthesized ambient chord after user interaction.

## Prototype scope

One short chapter, one species, one water-restoration puzzle, and a narrative choice. The choice updates the field notes for the current session. No save system, physics, controller/Arduino integration, or downloadable Windows build is included. Reload to begin again. Existing coursework folders are unchanged.

## Preview compatibility

The standalone page was tested in Chromium inside a sandboxed HTML iframe with only `allow-scripts`, and with all network requests blocked. The full photo → waterway → memory → choice chapter completes without sibling files. It was also tested through HTTP with subresource requests blocked. If audio is unavailable, the game stays playable silently; if Canvas is unavailable, it displays an explanatory message.
