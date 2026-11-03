# Sovia Avatar Studio

A local illustration character studio. Import a PNG, trace the eyes, and mark the mouth, chin, neck, and crown to create a character with gentle head turns, blinking, mouth movement, and breathing.

Built as an independent **Next.js App Router + TypeScript + Biome + shadcn/ui** application. The document format and WebGL renderer are independent of Mesh Avatar Studio and its runtime. No Python, streaming, camera, or microphone features are required or included. All application text, documentation, source comments, and filenames use English.

## Getting started

Install Node.js 22.17 or a newer supported LTS version.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:6080. On Windows, double-click **start-studio.cmd**. Installing dependencies requires an internet connection; character editing never sends images to external services.

For production mode:

```sh
npm run build
npm start
```

## Create a character

Sovia is bundled as the default example. Select **Open Sovia example** on the home page to preview her immediately. Select **Save a copy** to create an editable local project; the bundled example remains unchanged. The approved example uses the same independent character format as your own work.

The example now includes 20 saved parts: a skin foundation, a hair influence mask, eight neutral eye components, and ten drawn eye/mouth patches. Eight root-to-tip hair guides are included as editable project data. These are artwork resources and reviewed coordinates, not a dependency on the previous implementation.

1. Select **New character** in the library and choose a transparent PNG, up to 20 MB.
2. Trace each eye with at least four points. Use the zoom controls for details and drag points to refine their positions.
3. Mark the mouth center, chin, neck pivot, and crown.
4. Enter a name and create the character. You can continue adjusting landmarks and motion ranges in the editor.
5. Open **Motion preview**, check the movement, and select **Save changes**.
6. Select **Export character** to download an `.avatarstudio` archive. Importing an archive creates a separate project without overwriting existing work.

Images must be 64–4096 pixels per dimension, with no more than 8 million pixels in total. Transparent, nearly front-facing artwork works best. Projects are stored in `projects/studio-v1/<UUID>/`; names are independent of directory paths. Back up this directory or export character archives.

## Current capabilities and limitations

- An independent mesh projection uses the eye line to establish the head's local orientation and keeps the neck pivot stable. Default maximum yaw is 14 degrees and pitch is 9 degrees. Large head turns may look unnatural.
- Characters with drawn frames use their saved closed, half-open, and smiling eyes, plus open, half-open, wide, and round mouths. Characters without these optional resources retain the procedural fallback. Frame blending and all GPU/rendering code are independently implemented.
- Gentle breathing, automatic blinking, motion playback, speech testing, and preview PNG downloads are available. Preview requires WebGL.
- Masked, spring-driven hair motion uses saved root-to-tip guides. The influence mask keeps movement away from the face and clothing; the editor exposes sway strength and a guide summary.
- Automatic part extraction, a graphical hair-guide placement editor, hand separation, and hidden-profile reconstruction are not implemented. Single-image turns and expression patch boundaries still need visual review.
- Legacy `.mavatar`, `rig.json`, and old project directories are not this application's format and are not silently converted. Existing private project files remain on disk.

The application binds to the loopback interface for personal use. It has no remote multi-user authentication or public deployment features.

## Layers and expressions

Open the **Layers and expressions** tab to inspect each saved PNG, its role, channel, expression state, placement, visibility, and opacity. Position and size use percentages of the original artwork. **Focus face** in the preview makes eye and mouth inspection easier.

Save a copy of the example before importing images. **Import part** adds a cropped PNG as a neutral part; select its channel, role, and state as needed. Select an existing frame and use **Replace image** to update that slot. Validation prevents duplicate expression states and inconsistent resource references. Use **Save changes** to persist edits.

Export includes every referenced part image, even when disabled, and all hair guides. Import restores them into a new local project. Missing or damaged images cause an explicit error instead of silently disappearing. Archives are limited to 64 MB compressed and 80 MB expanded. PNG resources are checksum-addressed; files uploaded but not attached to the saved document remain local and are not exported.

## Development

```sh
npm run check
npm run typecheck
npm test
npm run build
npx playwright install chromium --no-shell
npm run e2e
```

Biome handles formatting, import organization, and static checks. The Radix components in `src/components/ui` were generated with the official shadcn CLI. The application does not require the CLI at runtime. Add components with `npx shadcn@4.23.0 add <component>`.

Tests use programmatically generated generic artwork. Test data is isolated in ignored `projects/.tests-*` and `projects/.e2e-v1` directories. Production output tracing excludes private artwork and scratch directories.

Read the [architecture](docs/architecture.md), [character format](docs/character-format.md), and [validation record](docs/validation.md).

## Privacy and licensing

Keep personal artwork and derived files in ignored `projects/`. Keep scratch tools, local backups, and logs in ignored `work/`. The owner explicitly approved Sovia's default example and the migration of its separated parts, drawn expressions, and reviewed hair guides. Only those published example resources are under `public/examples/sovia/`; private projects, original generation inputs, trial files, and old implementation code are excluded. User-created names and private artwork are preserved as user data, regardless of their language.

See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md). Technical references: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [shadcn/ui](https://ui.shadcn.com/docs/installation/next), and [Biome](https://biomejs.dev/guides/getting-started/).
