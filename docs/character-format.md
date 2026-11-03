# Character format v1

The format identifier is `studio.character/v1`. Its executable definition is the Zod schema in `src/features/characters/document.ts`. It has no legacy rig or layer manifest dependency.

The built-in Sovia example uses this same format with the reserved ID `e546d263-8121-4766-b034-a617ab9f619f`. Its `readOnly` library flag is response metadata, not a stored character field. Saving the example creates a new UUID-backed project; exported example archives can also be imported as independent editable projects.

Local project layout:

```text
projects/studio-v1/<UUID>/
  character.json
  portrait.png
  assets/<sha256>.png      Optional referenced part images
```

An `.avatarstudio` archive is a ZIP containing the document, artwork, and exactly the optional part images referenced by that document:

```text
character.json
artwork/portrait.png
assets/<sha256>.png
```

| Field | Meaning |
| --- | --- |
| format | Exact version identifier; unknown formats and versions are rejected |
| id | UUID; regenerated on import to avoid overwriting a local project |
| name | Display name of 1–60 characters; never used as a file path |
| revision | Save revision starting at zero, used to reject stale writes |
| createdAt / updatedAt | ISO timestamps managed by the local server |
| artwork | Fixed image filename, actual dimensions, and SHA-256 |
| landmarks.leftEye / rightEye | Ordered image-left / image-right contours, 4–40 points each |
| landmarks.mouth / chin / neck / crown | Mouth center, chin, stable neck pivot, and crown |
| motion.yaw / pitch | Maximum horizontal / vertical rotation in degrees |
| motion.blink / breathe | Automatic blinking and breathing toggles |
| resources.version | Optional resource extension version, currently 1 |
| resources.parts | Ordered, named layers and expression frames with image references and placement |
| resources.hair | Optional sway strength and root-to-tip spring guides |

Every point is an object such as `{ "x": 0.5, "y": 0.3 }`, with values between zero and one relative to artwork width and height. The origin is the top-left corner; positive axes run rightward and downward. Eye names refer to image space, not the character's anatomical left and right. The eye contours define head orientation without storing a redundant angle that could become inconsistent.

## Optional resource extension

Each part has a unique stable `id`, display `name`, `channel`, `role`, `state`, `image`, `region`, `visible`, and `opacity`. Channels are `artwork`, `left-eye`, `right-eye`, `mouth`, and `hair`. Roles distinguish the foundation, iris, upper/lower eyelids, crease, drawn expression, and hair influence mask. Eye frames use `closed`, `half`, and `smile`; mouth frames use `half`, `open`, `wide`, and `round`. Neutral components use `neutral`.

`image` contains SHA-256 and actual PNG dimensions. Its file path is derived as `assets/<sha256>.png`; arbitrary paths are not accepted. `region` contains normalized `x`, `y`, `width`, and `height`, bounded by the artwork. Multiple parts may reference the same image, which is stored only once. Disabled parts remain referenced and survive export. A foundation is optional; without it the original artwork remains the fallback surface.

Hair data stores overall `strength` and guides with unique IDs, names, normalized point arrays, influence radii, and spring stiffness. Mask images restrict guide movement to hair pixels. These values are explicit data rather than a serialized runtime implementation.

The extension allows at most 64 parts, 32 hair guides, and 32 million pixels across unique images. Each PNG is limited to 20 MB and 8 million pixels. Documents are limited to 256 KB, compressed archives to 64 MB, and expanded archives to 80 MB. Unknown paths, duplicate ZIP entries, unreferenced entries, missing files, checksum/dimension mismatches, and unsupported formats are rejected.

Original PNG bytes are preserved. Images are written before the new project document is published. Saving validates all references before atomically replacing the document. Uploaded images are immutable and content-addressed; unreferenced local uploads are retained rather than being deleted as a side effect of saving. Import creates a fresh UUID and restores all references. Plain characters without `resources` remain valid and use procedural rendering.
