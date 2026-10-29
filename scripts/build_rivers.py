"""Embed the game's assets into index.html for standalone HTML previews."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent.parent


def embed(html, pattern, content):
    updated, count = re.subn(pattern, lambda _: content, html, count=1, flags=re.DOTALL)
    if count != 1:
        raise ValueError(f"Expected one asset marker matching {pattern!r}")
    return updated


def main():
    path = ROOT / "index.html"
    html = path.read_text()
    css = (ROOT / "rivers.css").read_text()
    js = (ROOT / "rivers.js").read_text().replace("</script", "<\\/script")
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
    path.write_text(html)
    print("Built standalone index.html (no external assets required).")


if __name__ == "__main__":
    main()
