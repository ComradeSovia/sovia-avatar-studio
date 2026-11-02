import { expect, test } from "@playwright/test";
import { DEFAULT_EXAMPLE_ID, DEFAULT_EXAMPLE_URL } from "@/features/characters/example";

test("Sovia is the default example and changes save to an editable copy", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Loading local characters…", { exact: true })).toBeHidden();
  const items = await (await request.get("/api/characters")).json();
  expect(items[0]).toMatchObject({ id: DEFAULT_EXAMPLE_ID, name: "Sovia", readOnly: true });
  await expect(page.getByRole("img", { name: "Sovia", exact: true })).toBeVisible();
  await page
    .getByRole("img", { name: "Sovia", exact: true })
    .evaluate((image: HTMLImageElement) => image.decode());
  await page.screenshot({ path: "projects/.review/default-sovia-library.png" });
  await page.getByRole("link", { name: "Open Sovia example", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${DEFAULT_EXAMPLE_ID}$`));
  await expect(page.getByRole("heading", { name: "Sovia", exact: true })).toBeVisible();
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a copy", exact: true })).toBeEnabled();
  const original = await (await request.get(`/api/characters/${DEFAULT_EXAMPLE_ID}`)).json();
  expect(
    (await request.put(`/api/characters/${DEFAULT_EXAMPLE_ID}`, { data: original })).status(),
  ).toBe(403);
  await page.getByRole("tab", { name: "Motion preview", exact: true }).click();
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible();
  await page.locator("#pose-yaw").getByRole("slider").focus();
  await page.locator("#pose-yaw").getByRole("slider").press("End");
  await page.screenshot({ path: "projects/.review/default-sovia-editor.png", fullPage: true });
  await page.getByRole("tab", { name: "Landmarks", exact: true }).click();
  await page.getByLabel("Character name", { exact: true }).fill("My Sovia example");
  await page.getByRole("button", { name: "Save a copy", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(`${DEFAULT_EXAMPLE_ID}$`));
  await expect(page.getByRole("heading", { name: "My Sovia example", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeVisible();
  const copyId = page.url().split("/").pop()!;
  expect(copyId).not.toBe(DEFAULT_EXAMPLE_ID);
  expect(await (await request.get(`/api/characters/${DEFAULT_EXAMPLE_ID}`)).json()).toEqual(
    original,
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "My Sovia example", exact: true })).toBeVisible();
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(DEFAULT_EXAMPLE_URL).toBe(`/characters/${DEFAULT_EXAMPLE_ID}`);
});
