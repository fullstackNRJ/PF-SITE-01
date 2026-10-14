# Neeraj — Portfolio (PF-Site-01)

A 2D interactive gallery portfolio. Content-driven by design: the UI, the
navigation engine, the card renderer and the content system are four separate
concerns that only meet through plain data.

Stack: Astro (islands) + React + TypeScript (strict) + Tailwind CSS v4.

## Layering

```
model    ->  src/lib/types.ts     the authoritative content model
             src/lib/vocabularies runtime lists every union derives from
authoring->  src/content/**       JSON sections + Markdown posts
API      ->  src/lib/content.ts          load + validate + assemble (server)
             src/lib/content-access.ts   pure accessors (any environment)
             src/components/content/     React binding for the same API
rules    ->  src/lib/navigation   pure engine (model + reducer + keyboard)
render   ->  src/components/cards content type -> React component registry
compose  ->  src/components/{shell,gallery,navigation,ui}
```

Dependency direction is one-way. The important boundaries:

- `src/lib/types.ts` is the authoritative model and has no Astro or React
  dependency. It describes what the UI receives: fully resolved, with none of
  the authoring shortcuts.
- `src/lib/vocabularies.ts` holds the runtime lists (`CARD_TYPES`,
  `LINK_KINDS`, …). `types.ts` derives its unions from them and
  `content.config.ts` builds its Zod enums from the same arrays, so the
  validator and the model cannot drift.
- `src/lib/content.ts` is the **only** module that imports `astro:content`. It
  loads, validates, assembles, and memoizes.
- `src/lib/content-access.ts` has no Astro and no React dependency. It builds an
  indexed, synchronous accessor over a snapshot.
- `src/components/cards/registry.ts` is the single binding between a `CardType`
  and its React renderer. It is a mapped type over `CardType`, so each entry is
  checked against the item it claims to draw, and adding a type fails the build
  here until a renderer exists.

### Why the API exists twice

Hydrated islands cannot import `astro:content`, and functions cannot be passed
as props. So the snapshot travels as plain data and the accessor is rebuilt on
the client from the same pure code:

| | build time | render time |
| :--- | :--- | :--- |
| entry | `src/lib/content.ts` | `ContentProvider` |
| shape | `Promise<T>` | `T` |
| use | `await getSection('work')` | `useContent().getSection('work')` |

Both are backed by `createContentAccess`, so the two never diverge.

## Content API

`src/lib/content.ts` — server, async, memoized to one load per process:

```ts
getSiteConfig()          // SiteConfig
getSections()            // readonly Section[]
getSection(id)           // Section | null
getSectionItems(id)      // readonly SectionItem[]
getPost(id)              // Post | null   (includes Markdown body)
getContentSnapshot()     // everything, for passing into an island
getContentAccess()       // the synchronous accessor
```

Inside components, the same five methods are synchronous via `useContent()`.
Nothing in a component ever holds a copy of content data.

### Validation

Structure is validated per file by the Zod schemas in `src/content.config.ts`,
which Astro runs on every load. `src/lib/content.ts` then validates the
*relationships* those schemas cannot see, also with Zod, and fails the build
with one readable report:

- exactly one site config exists
- `site.entrySection` names a real section
- at most one section sets `nav.entry`
- item ids are unique within a section
- every `article` item's `postId` names a real post

```
ContentError: Content validation failed:
  • sectionEntries: Section "writing" item "spatial-ui" points at does-not-exist,
    which is not a post. Expected src/content/posts/does-not-exist.md.
    Known posts: content-first, designing-for-the-second-visit, ….
```


## Content model

Two layers, on purpose:

| | authoring (`src/content/**`) | domain (`src/lib/types.ts`) |
| :--- | :--- | :--- |
| `order` | optional, falls back to array position | always present |
| article title | optional, inherited from the post | always present |
| dates | `YYYY-MM-DD` string **or** YAML `Date` | always an ISO string |

That gap is the loader's entire job, and it is the only place that knows both
sides.

### Adding content

**Add an item** — append an object to a section's `items` array in
`src/content/sections/*.json`. No component changes. Verified: appending one
item took the rail from 25 to 26 items with zero code edits.

**Add a section** — drop a new `src/content/sections/<id>.json`. The id comes
from the file name, and its `nav.position` places it in the 2D plane.

**Add a card type** — add the string to `CARD_TYPES` in
`src/lib/vocabularies.ts`. The union, the validator and the registry all widen;
the build breaks in exactly three places (schema case, loader case, registry
entry) until you handle them.

### Card types

| type | draws | notable fields |
| :--- | :--- | :--- |
| `project` | something built | `role`, `timeframe`, `stack`, `highlights` |
| `experience` | a role held | `company`, `role`, `timeframe`, `employment`, `location` |
| `article` | a Markdown post | `postId` → resolved `post` summary |
| `profile` | the person | `headline`, `location`, `pronouns`, `email`, `skills` |
| `link` | somewhere else | `href`, derived `domain`, `category` |
| `stack` | a technology | `name`, `category`, `proficiency`, `years` |

Every item also carries `id`, `title`, `summary`, `order`, `tags`, `featured`,
`status`, `links` and optional `media`.

## Structure

```text
src/
├── components/
│   ├── content/      ContentProvider + useContent (React binding)
│   ├── shell/        AppShell (island root), PortfolioShell, header, help dialog
│   ├── navigation/   NavigationProvider + useNavigation
│   ├── gallery/      FocusedWindow, BrowseView, DetailView, ItemIndex, ItemDetail, ItemCta, CardRail, GalleryCard
│   ├── motion/       TransitionSurface, travel token (animation only)
│   ├── cards/        card frame, per-type renderers, registry, dispatcher
│   └── ui/           Surface, Stack, Badge primitives
├── content/
│   ├── site.json     global config: author, social, entry section
│   ├── sections/     one JSON per node: nav metadata + items
│   └── posts/        Markdown, referenced by `article` items
├── lib/
│   ├── types.ts          the content model
│   ├── vocabularies.ts   runtime string lists
│   ├── content.ts        the content API (server, Astro-backed)
│   ├── content-access.ts pure accessors + ordering
│   ├── format.ts         date and timeframe formatting
│   ├── navigation/       model.ts, engine.ts (+ tests), shortcuts.ts, types.ts
│   ├── rail.ts           ring geometry for the endless rail (pure, tested)
│   └── utils/            cn
├── layouts/          Layout.astro (document shell)
├── pages/            index.astro (loads content, hydrates AppShell)
└── styles/           global.css (Tailwind entry)
```

## Interface

Three stacked regions: a minimal identity header, one large focused window, and
a horizontal rail of section cards below it. Everything on screen is read from
the content API (`useContent()`); nothing is hard-coded in a component.

| Component | Role |
| :--- | :--- |
| `PortfolioShell` | composes header, window and rail |
| `FocusedWindow` | active section: title, numbered item list, preview, item view |
| `CardRail` / `GalleryCard` | an endless rail with one card per section; the active one joins the window |

The two axes match the keyboard: **horizontal** (the rail) moves between
sections, **vertical** (the list inside the window) moves between items. The
preview goes through the card registry, so a new card type needs no change here.

The active card is connected to the window with borders alone: the rail's top
border is the window's bottom edge, and the active card is pulled up 1px with
the window's background so it covers that line. Inactive cards hang lower with a
gap. Motion is described under Motion below. On `lg` screens the page fits the
viewport and the window panes scroll internally; below that the window has a
fixed height, so content never resizes it, and the rail scrolls horizontally.

## Cards

`CardRenderer` takes a typed `SectionItem` and renders the component registered
for `item.type`: `ProjectCard`, `ExperienceCard`, `ArticleCard`, `ProfileCard`,
`LinkCard`, `StackCard`. The registry is a mapped type over `CardType`, so a new
type fails the build until it has a renderer, a label, and a loader case.

Every card is built on `CardFrame` and the primitives in `CardParts` (`MetaList`,
`ChipRow`, `HighlightList`, `TagList`, `LinkList`), and receives two optional
props from whoever places it: `selected` and `position`.

- **Accessible label**: `CardFrame` renders an `<article>` named by
  `cardLabel(item, position)` in `src/lib/card-label.ts`, e.g.
  "Staff Engineer at Northwind Labs, experience, Mar 2022 to present, 1 of 4".
  It is a pure function with an exhaustive switch and its own tests.
- **Selected state**: `aria-current="true"` plus a 2px bar, a brighter title and
  a `▸` marker. The marker reserves its width when hidden, so nothing shifts.
- **No navigation logic**: cards have no key handlers, focus calls or
  `useNavigation`. The parent derives `selected` from navigation state and passes
  it down. Keyboard use works because links inside a card are ordinary tab stops
  and the global handler ignores Enter on links, so Enter activates the link
  rather than opening the item.

## Endless rail

The data is finite (`N` sections, canonical index `0..N-1`, owned by the
navigation engine); only the presentation is continuous. `CardRail` keeps an
unbounded integer cursor beside the canonical index, with
`canonical = mod(cursor, N)`. Pressing `→` on the last section just increments
the cursor, so the track keeps sliding left and the first section arrives from
the edge. Wrapping exists only when a position is turned back into a section, so
there is nothing to jump. All of it is pure functions in `src/lib/rail.ts`.

- **Direction follows the key or click**, never the index change. `virtualStep`
  takes the intended `sign`, so `→` from the last section is `+1`, `Home` is
  backward, and clicking the card on the *left* moves left even when its
  canonical index is higher. Pointer selection passes that direction into the
  engine (`focusSection(index, direction)`), so the rail and the window agree.
- **Repositioning near an edge.** The viewport only moves when the active card
  would enter the outermost card on either side, and then by the least needed.
- **Nothing is copied.** Cards are rendered by indexing the existing sections.
  What repeats is a card on screen, never the content. Mounted cards are the
  viewport plus a one-card buffer, plus whatever the track still has to slide
  past; that part is bounded by how far the track lags, not by key presses
  (holding an arrow key peaks at about 10 cards for 5 sections).
- **Each section is exposed once.** The repeat nearest the active card is the
  real button; the others are `aria-hidden`, not focusable, but still clickable.
  Only the active card is a tab stop (roving tabindex); arrow keys do the rest.
- **Reduced motion** repositions instantly, with the same state.

## Motion

`FocusedWindow` presents navigation state and never owns it. Direction comes from
the engine: every selection change records a `travel` (`axis` and `sign`) that
follows the **key**, not the index change, so ArrowRight from the last section
wraps to the first and still travels forward.

| Key | Old view | New view |
| :--- | :--- | :--- |
| `→` | exits left | enters from the right |
| `←` | exits right | enters from the left |
| `↓` | moves up | enters from below |
| `↑` | moves down | enters from above |

Navigation only reports the direction. `src/components/motion/` turns it into a
`data-travel` token, and `global.css` owns the distances and timing (32px or 20px,
180ms). Neither the engine nor the content layer knows animation exists.

How it avoids the usual problems:

- **No delay.** The live view is committed in the same render as the state
  change; React never waits for an animation.
- **No layout shift.** Both layers are absolutely positioned in a surface of fixed
  size, and only `transform` and `opacity` animate. Media reserves its aspect
  ratio before it loads.
- **Nothing hidden from assistive tech.** The live view is never `aria-hidden`.
  The exiting view is a visual copy, `inert` and `aria-hidden`, so it takes no
  focus and is not announced. There is at most one at a time.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` no exiting copy is
  created and the CSS animations are off; navigation is unchanged.
- **Why the window views are props-only.** The exiting copy is the previous render
  drawn again with its old props. If those views read navigation state they would
  show the new selection and fight the live view for focus, so `BrowseView`,
  `DetailView`, `ItemIndex` and `ItemDetail` take everything as props, and
  `FocusedWindow` is the only place DOM focus follows state.

## Links and media

Authored URLs only ever render through `SafeLink`, which uses `classifyHref` in
`src/lib/links.ts`: http(s), `mailto:` and same-site paths are allowed;
`javascript:`, `data:`, protocol-relative URLs and anything obfuscated with
control characters are refused and shown as plain text. External links open in a
new tab with `rel="noopener noreferrer"` and say so to screen readers, because
navigation state lives in memory and leaving the page would lose your place.

`callToAction(item)` picks one contextual action from an item's links (primary,
then demo, source, write-up, external, social, email), worded for the kind of
link, or none when there is no usable URL. Media comes from `item.media` in the
content JSON and renders in a box sized by its `aspect`.

## Interaction

The whole portfolio is usable without a mouse. Navigation is Portfolio → Sections
→ Items; the rules are pure functions in `src/lib/navigation/engine.ts` and
React only owns state and the keyboard listener. Press `?` in the app for the
same list, which is generated from `src/lib/navigation/shortcuts.ts`.

| Key | Action |
| :--- | :--- |
| `←` / `→` | previous / next section (**wraps**) |
| `↑` / `↓` | previous / next item (**clamps**) |
| `Home` / `End` | first / last section |
| `Enter` | open the selected item |
| `Esc` | close help, otherwise leave the item view |
| `?` | show / hide keyboard help |

`preventDefault` is called only for the keys whose default is scrolling
(arrows, Home, End). Enter, Esc and `?` keep their native behaviour. The guard
leaves modifier combos, text fields and Enter on a focused button or link alone,
and ignores everything except Esc and `?` while the help is open.

### Accessibility

- **Focus is visible**: a global `:focus-visible` outline, plus a thicker ring
  and a `▸` marker for the selected item and section, so selection never relies
  on colour alone.
- **`aria-current="true"`** marks the active section button and the selected item.
- **Roving tabindex**: only the selected item is in the tab order, so Tab
  reaches the gallery once instead of crossing every card.
- **Focus follows selection for keyboard input only.** A mouse click on the rail
  does not move focus; arrow keys do. The provider's `keyboardTick` is what lets
  components tell the two apart.
- **Names**: items are labelled "Title, type, n of N", section buttons include
  their item count, key glyphs carry a spoken name, and a polite live region
  announces section changes.
- **Help** is a native modal `<dialog>`: focus is trapped while open, Esc closes
  it, and focus returns to where it was. Other keys are not consumed meanwhile.
- A **skip link** and landmarks (`banner`, `navigation`, `main`, `contentinfo`).
- The item view has a visible **Back** button, and the gallery stays mounted
  (hidden) while it is open so focus can return to the row you left.

### Tests

`npm test` runs every `src/**/*.test.ts` on Node's built-in runner
(no test dependency). It covers movement, wrapping vs clamping, Home/End, the
item view, modal help, the key guard, and a check that every key shown in the
help is actually bound.

## Commands

| Command           | Action                                     |
| :---------------- | :----------------------------------------- |
| `npm install`     | Install dependencies                       |
| `npm run dev`     | Start dev server at `localhost:4321`       |
| `npm run check`   | Type-check `.astro`, `.ts` and `.tsx`      |
| `npm test`        | Run the navigation engine unit tests       |
| `npm run build`   | Type-check, then build to `./dist/`        |
| `npm run preview` | Preview the production build               |

## Not done yet

- **Animations.** Transitions between sections and between gallery and detail
  mode are deliberately instant.
- **`nav.position` is unused.** Sections still carry 2D coordinates in JSON from
  the earlier spatial design, but the keyboard contract is hierarchical, so
  nothing reads them. Either wire spatial movement back in or drop the field.
- **Rendering post bodies.** Detail mode shows an article's raw Markdown source.
  Rendering it properly needs a decision (and a renderer) that has not been made.
- **Deep links.** Navigation state is in memory only; it is not reflected in the
  URL, so a reload always starts at the entry section.
- **Responsive layout** beyond a single breakpoint.

