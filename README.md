# Greed Unblocker

Greed Unblocker is a browser-focused web app with customizable themes, four
search providers, multi-tab browsing with site icons, a searchable games
catalog, optional ad filtering, and an on-demand developer console.

The experimental ad filter is off by default. Sites that fail through the
relay can be opened directly in a new tab.
Themes and search providers can be changed in Settings. Brave, Google, and
DuckDuckGo searches request SafeSearch off.

The Appearance tab includes Default (Greed), Singularity, Wrath, and Honour
themes: black and white, light blue, red, and melancholic sepia, respectively,
each with a distinct font. Singularity and Wrath use `slogo.png` / `wlogo.png`
and Honour uses `honour.png`; the looping video backgrounds
(`singulairty.mp4`, `wrath.MP4`, and `honour.mp4`) are in
`assets/icons/greed assets/`.

The Debug button opens a Greed-themed Eruda developer console, loaded on demand
from jsDelivr.

The Games tab loads its catalog from Selenite, a source used by
[Lyra](https://github.com/selenesia/lyra), and plays selected games in an
Greed browser tab through the site's relay.

