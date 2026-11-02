# Validation record

Date: 2026-11-02. Environment: Windows, Node.js 24.21.0, Next.js 16.4.4. This record applies to the independent Next.js application.

## Automated verification

- Biome check: passes without errors or warnings.
- TypeScript: passes.
- Ten core tests cover the read-only default example, editable-copy isolation, document/archive round trips, contour validation, neutral deformation, neck/body stability, concurrent save conflicts, archive/path rejection, corrupt project isolation, origin checks, and request limits.
- Four browser tests cover opening and copying Sovia, preserving the bundled example, actual canvas marking, creation, motion playback, saving, reopening, export/reimport, API validation/conflicts, and a 390-pixel mobile library without horizontal overflow.
- Next.js production build passes. Output tracing excludes private projects and scratch data.
- Dependency installation audit reports zero known vulnerabilities. The shadcn CLI was removed after generating the UI components; their source and required runtime dependencies remain.

Local logs are in ignored `work/`; screenshots are in ignored `projects/.review/`. Tests use generated generic images and the explicitly approved built-in example. Other personal artwork is never committed as a fixture.

## Visual review

The library, landmark editor, and full-size motion preview were inspected in the browser. Sovia is now the default published example, using owner-approved artwork and reviewed landmarks in the new normalized document. The independent engine displays the artwork and supports combined turning, closed eyes, and mouth movement. Saving creates an editable local copy; direct writes to the bundle are rejected. Only the approved example resources are committed, with no private trial metadata or generated expression variants.

User-created private project names remain unchanged. Desktop editor and mobile library layouts have been reviewed.

Basic blinking can retain original eye lines. Procedural mouth shapes may differ from the original drawing style. Strong profiles, occlusions, and large rotations need richer artwork and future production features. These approximations are not described as drawn expression quality.

## Scope and history

The application loads no legacy runtime, rig format, legacy sample character, or streaming code. Tests run independently of the original repository. Mesh Avatar Studio is unchanged. Other personal resources and local scratch backups remain ignored.
