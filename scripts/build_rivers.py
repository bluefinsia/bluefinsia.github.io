"""Build an offline HTML game and, optionally, a repeatable game-only ZIP."""

import argparse
from pathlib import Path
import re
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parent.parent
PLAY_INSTRUCTIONS = """THERE ARE RIVERS IN THE SKY

Extract index.html and open it in a web browser with JavaScript enabled.
No server, package installation, or Internet connection is required.

Click or tap the ground to walk. Hold and drag to guide the wanderer.
WASD or arrow keys also move. Explore and collect drifting poem fragments.

1. Find the luminous lotus. Select Camera (2), approach it, and use the
   contextual action button or E to photograph it.
2. Find the ancient sluice. Select Water staff (3), approach it, and use
   the contextual action to restore the flow.
3. Approach the awakened memory, listen, and choose a future for the sanctuary.

1 selects Explore. J opens the journal. Escape closes panels. M toggles sound.
Sound is optional; the game remains playable silently. Reload to start again.
"""


def embed(html, pattern, content):
    if len(re.findall(pattern, html, flags=re.DOTALL)) != 1:
        raise ValueError(f"Expected one asset marker matching {pattern!r}")
    return re.sub(pattern, lambda _: content, html, count=1, flags=re.DOTALL)


def package(html):
    destination = ROOT / "downloads" / "rivers-in-the-sky.zip"
    destination.parent.mkdir(exist_ok=True)
    # Fixed timestamps and permissions keep identical builds byte-for-byte stable.
    with ZipFile(destination, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, contents in (("index.html", html), ("PLAY.txt", PLAY_INSTRUCTIONS)):
            entry = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            entry.compress_type = ZIP_DEFLATED
            archive.writestr(entry, contents.encode("utf-8"), compresslevel=9)
    print(f"Packaged {destination.relative_to(ROOT)} (index.html and PLAY.txt).")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", action="store_true", help="also build the game-only ZIP")
    args = parser.parse_args()
    path = ROOT / "index.html"
    html = path.read_text(encoding="utf-8")
    css = (ROOT / "rivers.css").read_text(encoding="utf-8")
    js = "\n\n".join(
        (ROOT / source).read_text(encoding="utf-8")
        for source in ("rivers-scene.js", "rivers.js")
    )
    js = re.sub(r"</script", lambda _: "<\\/script", js, flags=re.IGNORECASE)
    html = embed(
        html,
        r'<link rel="stylesheet" href="rivers.css">|<style id="rivers-styles">.*?</style>',
        f'<style id="rivers-styles">\n{css}\n</style>',
    )
    html = embed(
        html,
        r'<script src="rivers.js"></script>|<script id="rivers-game">.*?</script>',
        f'<script id="rivers-game">\n{js}\n</script>',
    )
    path.write_text(html, encoding="utf-8")
    print("Built standalone index.html (no external assets required).")
    if args.package:
        package(html)


if __name__ == "__main__":
    main()
