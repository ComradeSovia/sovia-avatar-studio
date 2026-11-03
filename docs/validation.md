# Validation record

Date: 2026-11-03. Environment: Windows, Node.js 24.21.0, Next.js 16.4.4. This record applies to the independent Next.js application.

## Automated verification

- Biome check: passes without errors or warnings.
- TypeScript: passes.
- Seventeen core tests cover the read-only example, twenty-part/eight-guide byte-for-byte archive round trips, incomplete/tampered images, PNG upload persistence, failed-save preservation, resource-schema constraints, expression selection, masked spring motion, neutral deformation, concurrent saves, archive/path rejection, origin checks, and request limits.
- Six browser tests cover opening and copying Sovia, preserving the bundle, actual landmark marking, part visibility/opacity/position edits, PNG imports, saving, reopening, complete resource export/reimport, drawn pose review, API validation/conflicts, and narrow layouts without horizontal overflow.
- Next.js production build passes. Output tracing excludes private projects and scratch data.
- Dependency installation audit reports zero known vulnerabilities. The shadcn CLI was removed after generating the UI components; their source and required runtime dependencies remain.

Local logs are in ignored `work/`; screenshots are in ignored `projects/.review/`. Tests use generated generic images and the explicitly approved built-in example. Other personal artwork is never committed as a fixture.

## Visual review

The library, landmark editor, parts editor, full-character preview, and face-focused preview were inspected. Sovia now preserves twenty part images and eight hair guides in the independent resource model. Rest, closed and smiling eyes, and open/wide/round mouths were reviewed. Closed eyes show no visible iris residue. The neutral eye layers and drawn frames are actually rendered, not merely listed as metadata. Copy/export/import restore all referenced PNG bytes and edited settings; missing resources fail explicitly. Only the approved ready-to-render example assets are committed, with no original generation inputs or private trial metadata.

User-created private project names remain unchanged. Desktop editor and mobile library layouts have been reviewed.

Characters without drawn frames still use procedural fallbacks and may retain original lines. Sovia's migrated mouth drawings have slight style differences, and original cutout edges have small residual pixels. Single-image large turns remain limited; neither hidden profiles nor hand separation are reconstructed. Hair guides are preserved and animated through an independent masked spring field; graphical guide placement and automatic part extraction remain unimplemented. No claim of legacy motion parity is made.

## Scope and history

The application loads no legacy runtime, rig format, legacy sample character, or streaming code. Tests run independently of the original repository. Mesh Avatar Studio is unchanged. Other personal resources and local scratch backups remain ignored.
