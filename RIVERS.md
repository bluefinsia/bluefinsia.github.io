# There Are Rivers in the Sky

A quiet ecological exploration game set in the Lotus Sanctuary. Guide a small wanderer through a painted landscape, gather drifting words, photograph living things, and restore a waterway to awaken a memory.

## Download

Download the [standalone game ZIP](https://github.com/bluefinsia/bluefinsia.github.io/raw/refs/heads/rivers-in-the-sky-prototype/downloads/rivers-in-the-sky.zip), extract it, and open `index.html` in your browser. The ZIP includes only the game and brief play instructions. If prompted, sign in to GitHub with access to this repository.

## Open the game

`index.html` contains the complete game, including its styles, procedural landscape, and game code. It works offline with JavaScript enabled and makes no external asset requests. If a file viewer blocks interactive HTML, download the ZIP, extract it, and open `index.html` in a browser.

For development, run this command from the repository:

```sh
python3 -m http.server 5501 --bind 127.0.0.1
```

Open the server's root page in a browser. No package installation is needed; artwork and sound are generated locally, and text uses system fonts.

## Play

- Click or tap the ground to walk; hold and drag to guide the wanderer. WASD and arrow keys also move.
- Explore and collect the drifting poem fragments.
- Approach the luminous lotus, select **Camera** (2), then use the contextual action button or **E** to photograph it.
- Approach the ancient sluice, select **Water staff** (3), and restore the flow with the contextual action.
- Approach the awakened memory and make a choice about the sanctuary's future.
- **1** selects Explore, **J** opens the journal, **Escape** closes panels, and **M** toggles optional sound.

## Build and package

After editing `rivers.css`, `rivers-scene.js`, or `rivers.js`, refresh the standalone page:

```sh
python3 scripts/build_rivers.py
```

To also refresh the downloadable game-only ZIP:

```sh
python3 scripts/build_rivers.py --package
```

The helper uses only the Python standard library. It embeds the scene renderer before the game code and produces a repeatable `downloads/rivers-in-the-sky.zip` containing only `index.html` and `PLAY.txt`. Commit the generated HTML and ZIP with their source changes.

## Scope and inspiration

This is one short browser chapter with procedural Canvas artwork, an ecological puzzle, a poem, and a narrative choice. Progress lasts for the current session; reload to begin again. It is not a full 3D engine or a Windows executable. Existing coursework folders are unchanged.

The visual direction is a design study inspired by [Wayfinder](https://wayfinder.nfb.ca): a contemplative landscape with sparse controls, wandering, and words discovered through exploration. The game's artwork, text, and code are original; no Wayfinder assets are included.
