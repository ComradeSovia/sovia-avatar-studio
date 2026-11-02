# Sovia Avatar Studio

These rules apply to this independent repository. Explicit user instructions take precedence.

## Scope and language

- Work in `C:\workspace\sovia-avater-studio`. The directory spelling is intentional. Do not modify `C:\workspace\mesh-avatar-studio` while working on this application.
- Use English for UI text, documentation, comments, errors, tests, filenames, and commit messages.
- Preserve user-provided artwork and user-created names as data. Do not translate, rename, or overwrite personal projects merely to satisfy the application language policy.
- Keep the application easy to use: a clear library, guided artwork marking, editing, preview, and portable project import/export. Implement working interactions with useful loading, empty, and error states.
- Streaming, camera, and microphone features are outside the current scope. Do not add them without a user request.

## Required stack and independence

- Use Next.js App Router, TypeScript, Biome, and official shadcn/ui components.
- Use Biome for formatting, import organization, and linting. Do not introduce a competing ESLint or Prettier setup.
- Use Node.js 22.17 or a newer supported LTS version. Do not introduce Python, uv, pip, or an external interpreter dependency.
- Maintain an independent document format and renderer. Do not depend on the old Mesh Avatar Studio runtime, rig format, layer manifests, SDK packages, or `.mavatar` compatibility.
- Do not restore the old application by copying its implementation or sample resources into the new source tree. The explicitly approved Sovia example described below is the only artwork exception.
- Preserve applicable licenses and attribution for third-party code. Generate or adapt shared UI primitives under `src/components/ui` instead of maintaining duplicate component systems.

## Architecture

- `src/app`: route handlers, pages, layouts, and global styles; keep business logic out of route wrappers.
- `src/features/characters`: character schema, archives, library, and creation workflow.
- `src/features/editor`: landmark editing, editor state, motion controls, and preview lifecycle.
- `src/engine`: independent deformation mathematics and WebGL rendering. Keep deformation calculations testable without React or the DOM.
- `src/server`: local persistence, request validation, limits, and security checks. Do not import filesystem code into client components.
- `src/components/ui`: reusable shadcn/ui primitives; `src/lib`: small shared utilities.
- `tests` and `e2e`: core tests and browser workflows. Use generated, generic fixtures; use the approved built-in Sovia example only for tests of that example's behavior.
- Avoid unnecessary packages, workspace splits, abstractions, or framework layers. Update `docs/architecture.md` when responsibilities change.

## Character data and persistence

- Use `studio.character/v1`, defined by the Zod schema in `src/features/characters/document.ts`. Document changes in `docs/character-format.md`.
- Store landmarks as normalized `{ x, y }` coordinates in the range 0–1. Eye names refer to image-left and image-right. Derive orientation from the landmarks instead of storing contradictory duplicate values.
- Manage artwork, landmarks, and motion settings explicitly. Validate at API, archive, and filesystem trust boundaries.
- Store projects under `projects/studio-v1/<UUID>/`. Display names must not become filesystem paths. Preserve original image bytes.
- Keep edits in memory until an explicit save. Use revisions to reject stale writes and atomic replacement to avoid partial document updates.
- Export `.avatarstudio` archives using the documented entries. Validate entry names, expanded sizes, document versions, artwork dimensions, and checksums. Import into a new project without overwriting an existing one.
- Never silently migrate, reinterpret, or overwrite legacy project data. Future optional resources need explicit schema and archive rules.
- Release WebGL resources and animation loops when previews unmount. Keep a stable neutral pose and neck pivot; report visible deformation limitations honestly.

## Privacy and local operation

- Keep personal images, masks, derived layers, character documents, exports, and review screenshots inside ignored `projects/`.
- Keep scratch scripts, logs, browser caches, and local backups inside ignored `work/`.
- Never stage personal character resources or bypass ignore rules. Do not publish private projects, generated variants, or trial files.
- Explicit exception: the user authorized Sovia as the default published example. Only its approved portrait, normalized example document, and provenance note in `public/examples/sovia/` may be committed and uploaded. This does not authorize any other personal resources or external image processing.
- Keep the built-in example read-only. Saving edits creates a private editable copy; never overwrite the bundled example from the UI.
- Do not add other personal resources to samples, tests, public assets, build artifacts, Git history, or GitHub uploads.
- Ask before sending any user image to an external image service. Local processing does not imply permission for external processing.
- Bind the development and production servers to loopback; the default port is 6080. Preserve origin checks, archive/path restrictions, upload limits, and exclusions for private data in production output tracing.
- Do not stop unrelated processes, delete user projects, or expose the application publicly as a routine troubleshooting step.

## Verification

For application, dependency, or configuration changes, run the relevant checks and complete this verification set before reporting the implementation as ready:

```sh
npm run check
npm run typecheck
npm test
npm run build
npm run e2e
```

- Browser tests require Chromium; install it with `npx playwright install chromium --no-shell` when needed.
- Inspect the actual interface after visual or language changes, including a narrow viewport and longer labels. Inspect character poses and eye/mouth details after rendering changes.
- Do not replace visual review with a successful command exit. Report remaining defects, procedural eye/mouth limitations, and any failed or skipped checks.
- Use focused tests for changed behavior. Do not remove meaningful assertions or claim targeted reruns are a full suite run.
- Documentation-only edits need a diff/whitespace review and consistency check; do not run unrelated rendering suites solely for prose changes.
- Keep current results and limitations in `docs/validation.md`. Private screenshots and logs remain ignored.

## Git and publishing

- Use English commit subjects and bodies.
- Use repository-local author and committer identity: `ComradeSovia <comrade@sovia.work>`. Verify the actual recorded identity; do not change global Git settings.
- Review the staged files before committing. Exclude `projects/`, `work/`, credentials, dependency directories, build output, and all personal resources except the explicitly approved default example.
- Use normal incremental commits. Rewrite published history only when explicitly requested by the repository owner.
- Do not recreate old prototype branches or reintroduce their commits. Never rewrite the original mesh repository's history.
- Publishing destination: `ComradeSovia/sovia-avatar-studio` on GitHub. Push only when requested or authorized in the current task, and inspect existing remote state before the first push.
- Do not force-push, replace unrelated remote history, change repository visibility, or delete remote branches without explicit authorization for that action.
