# Sovia default example

The repository owner explicitly approved publishing this example and using it as the application's default character.

- `portrait.png`: approved source artwork, preserved without re-encoding.
- `character.json`: reviewed landmarks and gentle motion settings in `studio.character/v1` format, with a dedicated example ID and no private trial metadata.
- `assets/<sha256>.png`: 20 checksum-addressed images for the foundation, hair mask, neutral eye pieces, and drawn eye/mouth frames. Their placement, states, visibility, opacity, and eight hair guides are described by the character document.

The owner also requested migration of the separated parts and drawn expressions. Existing PNG artwork and reviewed geometry were converted into the independent resource model; no previous implementation code or legacy manifests are bundled.

The example is read-only. Saving creates an editable project with all referenced images under the ignored local data directory. Export and import preserve the complete resource set. Original full-image generation inputs, masks used during generation, private trial files, and unrelated personal projects remain excluded.
