# Architecture

A single Next.js application organized around domain responsibilities. There is no multi-package workspace or dependency on the previous avatar runtime.

```text
src/
  app/                    Pages, layouts, global styles, and HTTP entry points
    api/characters/       List, create, save, artwork, and export endpoints
  features/
    characters/           Document schema, archives, library, and creation wizard
    editor/               Landmark canvas, editing state, and preview lifecycle
  engine/                 Independent deformation mathematics and WebGL renderer
  server/                 Local storage, request limits, and origin checks
  components/
    ui/                   Shared shadcn/ui primitives
    studio-shell.tsx      Application navigation and shell
  lib/                    Small shared utilities
tests/                    Document, archive, deformation, and storage tests
public/examples/sovia/     Explicitly approved, read-only default example
e2e/                      Browser creation, persistence, archive, and layout tests
docs/                     Architecture, format, and validation documentation
projects/                 Private artwork and character data; ignored by Git
work/                     Scratch files and local backups; ignored by Git
```

## Data flow

The wizard holds an unsubmitted PNG and normalized landmarks in memory. After submission, the server validates the file size, actual PNG dimensions, and document before creating a UUID directory. Failed creation removes only that new directory. Editing never re-encodes the original artwork.

The editor updates an in-memory character document, which feeds the preview immediately. Only explicit saves write to disk. Each save includes a revision; per-project serialization rejects stale writes with HTTP 409 instead of silently overwriting changes from another window. Documents are written to temporary files and atomically replaced. Export reads the saved version, so export is disabled while edits are unsaved.

Archive import accepts only two defined entries, limits compressed and expanded sizes, and validates the document version, PNG dimensions, and SHA-256. Imports receive a new UUID and retain the display name and motion settings. Archive paths are never used as arbitrary filesystem paths. Cross-origin writes are rejected, and the API exposes no arbitrary-file reader.

## Default example

The library lists the bundled Sovia example first, including on a fresh installation. Its reviewed document is validated against the regular character schema and its artwork checksum is verified. Reads use bundled assets without writing a project to disk. Direct saves to the example are rejected; the copy endpoint validates edited settings and creates a new private project. This keeps the default reproducible while allowing immediate experimentation.

## Rendering implementation

`deformation.ts` is a pure mathematics module independent of React, the DOM, and the old runtime. It reconstructs artwork pixels from normalized coordinates during calculation, derives local orientation from the eye line, and uses a curved depth model to provide turning parallax while keeping the neck and lower body stable.

`renderer.ts` owns the WebGL mesh, texture, and GPU resources. `scene.ts` independently composes the foundation, neutral eye pieces, and interpolated drawn expressions from normalized resource records. `hair.ts` drives guide springs and samples an explicit hair-only mask before displacing mesh points. Plain characters retain procedural eye/mouth rendering. Mesh rows are capped to keep extreme aspect ratios within 16-bit index limits. `preview.tsx` loads and decodes referenced PNGs, owns the animation loop and resource cleanup, and never persists projects. Missing images keep the preview in an explicit error state.

The resource extension stores images by checksum, independent of part IDs and display names. The storage layer verifies referenced files before saving. Copy and export collect only referenced files; import validates and restores the complete set. Uploaded replacement images do not overwrite existing bytes, so a failed save cannot corrupt the previous version. The parts editor modifies metadata in memory and writes through the same revision-aware save boundary.

Sovia's previous PNGs and reviewed coordinates were converted once as data. No previous runtime code or old manifests are required or shipped. The new composition, animation, storage, and editing implementations are independent. Streaming remains outside scope.
