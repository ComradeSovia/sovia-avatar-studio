import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { unpackCharacter } from "@/features/characters/archive";
import { DEFAULT_EXAMPLE_ID, DEFAULT_EXAMPLE_URL } from "@/features/characters/example";
import { resourceImages, resourceUrl } from "@/features/characters/resources";
import { fixturePng } from "../tests/fixture";

test("parts persist through editing, PNG import, archive export and fresh import", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(DEFAULT_EXAMPLE_URL);
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole("tab", { name: "Layers and expressions", exact: true }).click();
  await expect(page.getByText("20 parts", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Left closed eye/ }).click();
  await page.getByLabel("Part name", { exact: true }).fill("Left closed eye saved");
  await page.getByLabel("Part x percent", { exact: true }).fill("35.5");
  await page.locator("#part-opacity").getByRole("slider").focus();
  await page.locator("#part-opacity").getByRole("slider").press("End");
  await page.locator("#part-opacity").getByRole("slider").press("ArrowLeft");
  await page.getByRole("button", { name: "Save a copy", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(`${DEFAULT_EXAMPLE_ID}$`));
  const copyId = page.url().split("/").pop()!;
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole("tab", { name: "Layers and expressions", exact: true }).click();
  await page.getByRole("switch", { name: "Enable Left closed eye saved", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved locally");
  await page.reload();
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole("tab", { name: "Layers and expressions", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Enable Left closed eye saved", exact: true }),
  ).not.toBeChecked();
  let stored = await (await request.get(`/api/characters/${copyId}`)).json();
  const edited = stored.resources.parts.find((p: { id: string }) => p.id === "left-closed");
  expect(edited).toMatchObject({
    name: "Left closed eye saved",
    visible: false,
    opacity: 0.99,
    region: { x: 0.355 },
  });
  await page
    .getByLabel("Import part PNG", { exact: true })
    .setInputFiles({ name: "Imported detail.png", mimeType: "image/png", buffer: fixturePng() });
  await expect(page.getByLabel("Part name", { exact: true })).toHaveValue("Imported detail");
  await page.getByRole("switch", { name: "Enable Imported detail", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("21 parts", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export character", exact: true })).toBeEnabled();
  stored = await (await request.get(`/api/characters/${copyId}`)).json();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export character", exact: true }).click();
  const path = await (await download).path();
  if (!path) throw new Error("The archive was not downloaded.");
  const bytes = await readFile(path),
    bundle = unpackCharacter(bytes);
  expect(bundle.document.resources).toEqual(stored.resources);
  for (const asset of resourceImages(bundle.document.resources))
    expect(createHash("sha256").update(bundle.assets[asset.sha256]).digest("hex")).toBe(
      asset.sha256,
    );
  await page.screenshot({ path: "projects/.review/resources-editor.png", fullPage: true });
  await page.goto("/");
  await page.getByLabel("Import character archive file").setInputFiles({
    name: "complete.avatarstudio",
    mimeType: "application/x-avatar-studio",
    buffer: bytes,
  });
  await expect(page).toHaveURL(/\/characters\/[a-f0-9-]+/);
  const importedId = page.url().split("/").pop()!;
  expect(importedId).not.toBe(copyId);
  const imported = await (await request.get(`/api/characters/${importedId}`)).json();
  expect(imported.resources).toEqual(stored.resources);
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({ timeout: 20000 });
  for (const asset of resourceImages(imported.resources)) {
    const response = await request.get(resourceUrl(importedId, asset.sha256));
    expect(response.status()).toBe(200);
    expect(
      createHash("sha256")
        .update(await response.body())
        .digest("hex"),
    ).toBe(asset.sha256);
  }
  expect(errors).toEqual([]);
});
test("review drawn blinking, all mouth shapes and the hair-enabled preview", async ({ page }) => {
  await page.goto(DEFAULT_EXAMPLE_URL);
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole("tab", { name: "Motion preview", exact: true }).click();
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Focus face", exact: true }).click();
  await page.screenshot({ path: "projects/.review/resources-rest.png", fullPage: true });
  await page.locator("#pose-eyes").getByRole("slider").focus();
  await page.locator("#pose-eyes").getByRole("slider").press("Home");
  await page.screenshot({ path: "projects/.review/resources-closed.png", fullPage: true });
  await page.locator("#pose-eyes").getByRole("slider").press("End");
  await page.getByRole("button", { name: "Smiling eyes", exact: true }).click();
  await page.screenshot({ path: "projects/.review/resources-smile.png", fullPage: true });
  await page.getByRole("button", { name: "Neutral eyes", exact: true }).click();
  for (const shape of ["Open", "Wide", "Round"]) {
    await page.getByRole("button", { name: shape, exact: true }).click();
    await page.screenshot({
      path: `projects/.review/resources-mouth-${shape.toLowerCase()}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Reset pose", exact: true }).click();
  await page.getByRole("button", { name: "Play motion", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("tab", { name: "Layers and expressions", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
