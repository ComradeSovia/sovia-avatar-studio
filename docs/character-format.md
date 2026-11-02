# Character format v1

The format identifier is `studio.character/v1`. Its executable definition is the Zod schema in `src/features/characters/document.ts`. It has no legacy rig or layer manifest dependency.

Local project layout:

```text
projects/studio-v1/<UUID>/
  character.json
  portrait.png
```

An `.avatarstudio` archive is a ZIP containing exactly:

```text
character.json
artwork/portrait.png
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

Every point is an object such as `{ "x": 0.5, "y": 0.3 }`, with values between zero and one relative to artwork width and height. The origin is the top-left corner; positive axes run rightward and downward. Eye names refer to image space, not the character's anatomical left and right. The eye contours define head orientation without storing a redundant angle that could become inconsistent.

Original PNG bytes are preserved. Import verifies dimensions and checksum against the document and rejects unknown entries, missing files, unsupported formats, and oversized data. Drawn expression assets are not part of v1. Define their document fields and archive rules before adding future UI or renderer support.
