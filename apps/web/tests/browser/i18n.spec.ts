import { test, expect } from "@playwright/test";

test("Indonesian by default for id browsers, toggle switches and persists", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, locale: "id-ID" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Wait for hydration so the toggle's click handler is attached.
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page.locator(".hero h1")).toHaveText(
    "Ikuti setiap keterangan. Lihat perkara secara utuh.",
  );
  await expect(
    page.locator(".hero .status").getByText("Berbeda dari sumber"),
  ).toBeVisible();
  const toggle = page.getByRole("group", { name: "Bahasa", exact: true });
  await expect(
    toggle.getByRole("button", { name: "Bahasa Indonesia" }),
  ).toHaveAttribute("aria-pressed", "true");

  await toggle.getByRole("button", { name: "English" }).click();
  await expect(page.locator(".hero h1")).toHaveText(
    "Stay with the testimony. See the whole story.",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "lang")?.value,
  ).toBe("en");

  // The saved cookie wins over the id-ID browser language on the next request.
  await page.goto("/workspace");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Welcome to your workspace." }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Language", exact: true })
    .getByRole("button", { name: "Bahasa Indonesia" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Selamat datang di ruang kerja Anda." }),
  ).toBeVisible();
  await expect(page.getByLabel("Kata sandi")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(
    page.getByRole("heading", { name: "Selamat datang di ruang kerja Anda." }),
  ).toBeVisible();

  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/workspace"]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} overflows at ${width}px`,
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("English browsers default to English without a saved preference", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, locale: "en-GB" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("link", { name: "Open workspace", exact: true }),
  ).toBeVisible();
  await context.close();
});
