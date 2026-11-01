import { test, expect, type Page } from "@playwright/test";
import { createCase, register, uploadDocument } from "./helpers";
import { SEED, seedArchive } from "./seed-archive";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";

async function importArchive(page: Page, name: string, buffer: Buffer) {
  await page.getByRole("button", { name: "New case", exact: true }).click();
  await page.getByRole("button", { name: /Import a \.jude archive/ }).click();
  await page.getByLabel(/Choose a \.jude file/).setInputFiles({
    name,
    mimeType: "application/vnd.jude+zip",
    buffer,
  });
  await expect(
    page.getByRole("heading", { name: "Follow the evidence." }),
  ).toBeVisible();
}

async function openSeededHearing(page: Page) {
  await page.getByRole("tab", { name: "Hearings", exact: true }).click();
  await page
    .getByRole("button", { name: SEED.hearingTitle, exact: false })
    .click();
}

test("complete case workflow, imports, evidence, reviews and responsive navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = await register(page);
  // Seed a small synthetic case with one finding per status through the real .jude import.
  await importArchive(page, "synthetic-seed.jude", seedArchive());
  await expect(
    page.getByText("Synthetic material", { exact: true }),
  ).toBeVisible();
  await openSeededHearing(page);
  await expect(
    page.getByText("Changes appear automatically", { exact: true }),
  ).toBeVisible();
  for (const label of [
    "Supported",
    "Potential inconsistency",
    "Context needed",
    "Insufficient evidence",
  ])
    await expect(
      page.getByLabel("Filter findings").locator("option", { hasText: label }),
    ).toHaveCount(1);
  const transcript = page.getByRole("region", {
    name: "Transcript",
    exact: true,
  });
  await expect(transcript.locator("article")).toHaveCount(SEED.segments);
  await page.getByLabel("Search this transcript").fill("9:30");
  await expect(transcript.locator("article")).toHaveCount(1);
  await expect(transcript.locator("mark")).toHaveText("9:30");
  await expect(
    page.getByLabel("Following paused while filtering"),
  ).toBeDisabled();
  await page.getByLabel("Filter transcript by speaker").selectOption("Counsel");
  await expect(
    page.getByText("No matching statements.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear transcript filters" }).click();
  await expect(transcript.locator("article")).toHaveCount(SEED.segments);
  await expect(page.getByLabel("Follow new testimony")).toBeChecked();
  await page.getByLabel("Search this transcript").fill("[no match]");
  await expect(
    page.getByText("No matching statements.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear transcript filters" }).click();
  await page.getByLabel("Filter findings").selectOption("supported");
  await page.getByLabel("Search this transcript").fill("9:30");
  await transcript.getByRole("button", { name: "View finding" }).click();
  await expect(page.getByLabel("Filter findings")).toHaveValue("all");
  await expect(
    page
      .getByRole("region", { name: "Finding and source inspector" })
      .getByText("The accounts describe different arrival times.", {
        exact: true,
      }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear transcript filters" }).click();
  const visited = new Set<string>();
  for (let i = 0; i < SEED.findings; i++) {
    await page.getByRole("button", { name: "Next unreviewed" }).click();
    visited.add(
      await page
        .getByRole("region", { name: "Finding and source inspector" })
        .locator("h3")
        .first()
        .innerText(),
    );
  }
  expect(visited.size).toBe(SEED.findings);
  await page.getByLabel("Filter findings").selectOption("all");
  await page.getByRole("button", { name: "The accounts" }).click();
  await page
    .getByLabel("Your review note")
    .fill("Verify the date against the original log.");
  await expect(page.getByText("Unsaved note", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Supported Both accounts" }).click();
  await page.getByRole("button", { name: "The accounts" }).click();
  await expect(page.getByLabel("Your review note")).toHaveValue(
    "Verify the date against the original log.",
  );
  await page
    .getByRole("button", { name: "Mark reviewed", exact: true })
    .click();
  await expect(
    page.getByText("Reviewed by you · saved to the case"),
  ).toBeVisible();
  await expect(
    page.getByText(`1 of ${SEED.findings} reviewed`, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await openSeededHearing(page);
  await page.getByRole("button", { name: "The accounts" }).click();
  await expect(page.getByLabel("Your review note")).toHaveValue(
    "Verify the date against the original log.",
  );
  await page.getByLabel("Filter findings").selectOption("unreviewed");
  await expect(page.getByRole("button", { name: "The accounts" })).toHaveCount(
    0,
  );
  await page.getByLabel("Filter findings").selectOption("all");
  await page.getByRole("button", { name: "Supported Both accounts" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("Denied")) },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Copy question" }).click();
  await expect(
    page.getByText("Clipboard unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download original" }),
  ).toBeVisible();
  const original = await uploadDocument(
    page,
    "acceptance.txt",
    "First page\fThe ledger stamp was signed at the depot.",
  );
  await page.getByLabel("Search case evidence").fill("ledger stamp");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download original" }).click();
  expect(await readFile((await (await download).path())!)).toEqual(original);
  const archiveDownload = page.waitForEvent("download");
  // Export lives in the per-case Settings tab.
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await page.getByRole("link", { name: "Download .jude" }).click();
  const archiveBytes = await readFile((await (await archiveDownload).path())!),
    manifest = JSON.parse(strFromU8(unzipSync(archiveBytes)["manifest.json"]));
  expect(manifest.documents).toHaveLength(3);
  expect(manifest.segments).toHaveLength(SEED.segments);
  expect(manifest.findings).toHaveLength(SEED.findings);
  expect(
    manifest.findings.some(
      (f: { note: string; reviewed: boolean }) =>
        f.note === "Verify the date against the original log." && f.reviewed,
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Legal references" }).click();
  await expect(
    page.getByRole("button", { name: "Search legislation" }),
  ).toBeDisabled();
  await createCase(page, "Acceptance isolated case");
  await page.getByRole("tab", { name: "Hearings", exact: true }).click();
  await page.getByRole("button", { name: "New hearing", exact: true }).click();
  await page
    .getByLabel("Hearing title", { exact: true })
    .fill("Witness examination");
  await page
    .getByRole("button", { name: "Create hearing", exact: true })
    .click();
  await page.getByRole("button", { name: "Add transcript text" }).click();
  await page
    .getByLabel("Finalized statement")
    .fill("The witness arrived at ten in the morning.");
  await page.getByRole("button", { name: "Save & examine" }).click();
  await expect(
    page.getByText("Automatic analysis is unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /^Case documents/ }).click();
  await expect(page.getByText("0 documents", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("test-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: `${SEED.caseTitle} Synthetic exercise` })
    .click();
  await page.getByRole("tab", { name: "Hearings", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: /^Case documents/ }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Evidence", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Find connections", exact: true })
    .click();
  await page.getByText("Suggested links are ready", { exact: false }).waitFor();
  await page.getByLabel("Ask about this case").fill("jade receipt");
  await page
    .getByRole("button", { name: "Search evidence", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Relevant passages" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close search results" }).click();
  await page.getByRole("button", { name: "Connections", exact: true }).click();
  await page
    .getByRole("button", { name: "related", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirm connection", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reopen connection", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Evidence map", exact: true }).click();
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("button", { name: "New case", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Open case navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Close case navigation" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open case navigation" }),
  ).toBeFocused();
  await openSeededHearing(page);
  await page.getByRole("button", { name: "Supported Both accounts" }).click();
  await expect(
    page.getByRole("region", { name: "Finding and source inspector" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Back to findings" }).click();
  await expect(
    page.getByRole("button", { name: "Supported Both accounts" }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "All hearings", exact: true }).click();
  await page.getByLabel("Upload hearing transcript").setInputFiles({
    name: "witness.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Counsel: When did you arrive?\nWitness: I arrived at eight in the morning.",
    ),
  });
  await expect(page.getByLabel("Statement 2", { exact: true })).toHaveValue(
    "I arrived at eight in the morning.",
  );
  await page
    .getByLabel("Imported hearing title")
    .fill("Uploaded witness examination");
  await page.getByRole("button", { name: "Confirm & import hearing" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Uploaded witness examination",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analyze hearing", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "All hearings", exact: true }).click();
  const seededRow = page.getByRole("button", {
      name: SEED.hearingTitle,
      exact: false,
    }),
    uploadedRow = page.getByRole("button", {
      name: "Uploaded witness examination",
      exact: false,
    });
  await page.getByLabel("Search hearings").fill("eight in the morning");
  await expect(seededRow).toHaveCount(0);
  await expect(uploadedRow).toBeVisible();
  await page.getByRole("button", { name: "Needs review", exact: true }).click();
  await expect(page.getByText("No hearings match this view.")).toBeVisible();
  await page.getByRole("button", { name: "Clear hearing filters" }).click();
  await page.getByRole("button", { name: "Needs review", exact: true }).click();
  await expect(seededRow).toBeVisible();
  await expect(uploadedRow).toHaveCount(0);
  await page.getByRole("button", { name: "Needs review", exact: true }).click();
  await page.getByLabel("Upload hearing transcript").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "The witness says she arrived at eight in the morning.",
    ),
  });
  await expect(
    page.getByRole("button", { name: "Convert with AI" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close import preview" }).click();
  // Round trip: the exported archive imports as a new case with new ids and fresh review state.
  await importArchive(page, "roundtrip.jude", archiveBytes);
  const cases: { id: string; title: string }[] = await (
    await page.request.get("/api/v1/cases")
  ).json();
  const copies = cases.filter(
    (c) => c.title === SEED.caseTitle && c.id !== manifest.case.id,
  );
  expect(copies).toHaveLength(1);
  const copy = await (
    await page.request.get(`/api/v1/cases/${copies[0].id}`)
  ).json();
  const exportedIds = new Set(
    manifest.findings.map((f: { id: string }) => f.id),
  );
  expect(copy.findings).toHaveLength(SEED.findings);
  for (const f of copy.findings) {
    expect(exportedIds.has(f.id)).toBe(false);
    expect(f.reviewed).toBe(false);
  }
  expect(
    copy.findings.some(
      (f: { note: string }) =>
        f.note === "Verify the date against the original log.",
    ),
  ).toBe(true);
  await openSeededHearing(page);
  await expect(
    page
      .getByText("Imported finding · verify sources", { exact: false })
      .first(),
  ).toBeVisible();
  await page.getByLabel("Filter findings").selectOption("unreviewed");
  for (let i = 0; i < SEED.findings; i++)
    await page
      .getByRole("button", { name: "Mark reviewed", exact: true })
      .click();
  await expect(
    page.getByText(`${SEED.findings} of ${SEED.findings} reviewed`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next unreviewed" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "All hearings", exact: true }).click();
  await page.getByRole("button", { name: "Needs review", exact: true }).click();
  await expect(page.getByText("No hearings match this view.")).toBeVisible();
  expect(errors).toEqual([]);
});
