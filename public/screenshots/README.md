# Landing page screenshots

The home page (`src/pages/Home.jsx`) renders three screenshots from this folder.
A missing file is not an error: the frame falls back to a labelled placeholder,
so the page stays presentable until an image is added.

| File | Shown as | What to capture |
|---|---|---|
| `search-map.png` | Hero, below the call to action | Team search with the map view and visible match scores |
| `team-roles.png` | Open roles section | A team with its open roles and members |
| `team-chat.png` | Chat section | A team conversation with mentions, replies or reactions |

## Requirements

- **Aspect ratio 16:10.** The frame crops with `object-cover object-top`, so
  anything below that ratio is cut off from the bottom.
- **At least 1600 x 1000 px**, ideally 2560 x 1600 for high-DPI displays.
- **PNG**, and keep each file under roughly 500 KB — they are served as static
  assets on every landing page visit. Compress before committing.
- Capture in the **light theme** (the app ships light only) at a desktop width.

## Before committing a screenshot

This repository is public and the app is deployed publicly, so a screenshot is a
publication of whatever it shows.

- Use demo or test accounts only. No real names, avatars, email addresses or
  message content from real users.
- Check the corners for leftovers: browser bookmark bars, notification counts,
  other tabs, and anything in a sidebar.
- Team and profile data in the shot should be data you are comfortable having
  indexed by search engines.
