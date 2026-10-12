# Template assets

Put photos, GIFs, and other bundled media for each template here:

```
public/templates/<template-id>/
```

Examples: `berlin/`, `halloween/`, `miami/`, `acid/`, `new-york/`, `ultrapilled/`.

## Naming

Prefixed kebab-case so assets are easy to find in search / Finder:

```
template-<template-id>-<asset-name>.<ext>
```

| Template   | Example file                         |
| ---------- | ------------------------------------ |
| Acid       | `template-acid-big-ben.gif`          |
| Berlin     | `template-berlin-skull.gif`          |
| Halloween  | `template-halloween-hi-fi-spider.gif`|
| Miami      | `template-miami-coast-guard.jpg`     |

In code, `photo("berlin", "template-berlin-skull.gif", …)` resolves to
`/templates/berlin/template-berlin-skull.gif`.

Do **not** drop template media in `public/media/` — that folder is for app chrome
(about reel, mode-select, etc.), not canvas templates.

Credit third-party assets in that template’s `CREDITS.txt`.
