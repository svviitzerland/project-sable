import { test, expect, type Page } from "@playwright/test";
import { createCase, register, uploadDocument } from "./helpers";
import { SEED, seedArchive } from "./seed-archive";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";

const caseParam = (page: Page) => new URL(page.url()).searchParams.get("case");

async function importArchive(page: Page, name: string, buffer: Buffer) {
  const previous = caseParam(page);
  await page.getByRole("button", { name: "New case", exact: true }).click();
  await page.getByRole("button", { name: /Import a \.jude archive/ }).click();
  await page.getByLabel(/Choose a \.jude file/).setInputFiles({
    name,
    mimeType: "application/vnd.jude+zip",
    buffer,
  });
  // The imported case opens on its hearings, and the address names it.
  await expect.poll(() => caseParam(page)).not.toBe(previous);
  await expect(
    page.getByRole("heading", { level: 1, name: SEED.caseTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Hearings", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
}

async function openSeededHearing(page: Page) {
  await page.getByRole("tab", { name: "Hearings", exact: true }).click();
  await page
    .getByRole("button", { name: SEED.hearingTitle, exact: false })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: SEED.hearingTitle }),
  ).toBeVisible();
}

const findingsColumn = (page: Page) =>
  page.getByRole("region", { name: /^Jude highlights/ });

/** A finding card's header button in the findings column. */
const findingHeader = (page: Page, title: string | RegExp) =>
  findingsColumn(page).getByRole("button", { name: title });

const findingFilter = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Filter findings" })
    .getByRole("button", { name: new RegExp(`^${name}\\b`) });

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
  // Only the five case sections remain; the assistant floats over all of them.
  await expect(page.getByRole("tab")).toHaveText([
    /Hearings/,
    /Evidence/,
    /Case documents/,
    /Courtroom practice/,
    /Settings/,
  ]);
  await openSeededHearing(page);
  const seededCase = caseParam(page);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("hearing"))
    .toBeTruthy();
  const hearingAddress = page.url();
  // Reloading a hearing address keeps that hearing open.
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: SEED.hearingTitle }),
  ).toBeVisible();
  expect(caseParam(page)).toBe(seededCase);
  expect(page.url()).toBe(hearingAddress);
  await expect(
    page.getByText("Automatic analysis is unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(findingFilter(page, "All")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(findingFilter(page, "All")).toContainText(`${SEED.findings}`);
  await expect(findingFilter(page, "Differences")).toContainText("1");
  await expect(findingFilter(page, "To review")).toContainText(
    `${SEED.findings}`,
  );
  for (const label of [
    "Supported",
    "Potential inconsistency",
    "Context needed",
    "Insufficient evidence",
  ])
    await expect(
      findingsColumn(page).getByRole("button", { name: label }),
    ).toHaveCount(1);
  await expect(
    page.getByText(`0 of ${SEED.findings} reviewed`, { exact: true }),
  ).toBeVisible();
  await findingFilter(page, "Differences").click();
  await expect(findingsColumn(page).locator("article")).toHaveCount(1);
  await expect(findingHeader(page, /Door status conflicts/)).toBeVisible();
  const transcript = page.getByRole("region", { name: /^Transcript/ });
  await expect(transcript.locator("article")).toHaveCount(SEED.segments);
  // Search opens from the transcript header.
  await transcript
    .getByRole("button", { name: "Search this transcript" })
    .click();
  const transcriptSearch = transcript.getByRole("searchbox");
  await transcriptSearch.fill("9:30");
  await expect(transcript.locator("article")).toHaveCount(1);
  await expect(transcript.locator("mark")).toHaveText("9:30");
  await expect(
    page.getByText(`1 of ${SEED.segments} statements`, { exact: true }),
  ).toBeVisible();
  // The finding chip under a statement opens that finding, whatever the filter.
  await transcript
    .getByRole("button", { name: /The accounts differ on arrival time/ })
    .click();
  await expect(findingFilter(page, "All")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    findingHeader(page, /The accounts differ on arrival time/),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    findingsColumn(page).getByText(
      "The accounts describe different arrival times.",
      { exact: true },
    ),
  ).toBeVisible();
  await transcriptSearch.fill("[no match]");
  await expect(
    page.getByText("No matching statements.", { exact: true }),
  ).toBeVisible();
  await transcriptSearch.fill("");
  await expect(transcript.locator("article")).toHaveCount(SEED.segments);
  // One finding is open at a time.
  await findingHeader(page, /Both accounts name the supervisor/).click();
  await expect(
    findingHeader(page, /Both accounts name the supervisor/),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    findingHeader(page, /The accounts differ on arrival time/),
  ).toHaveAttribute("aria-expanded", "false");
  await findingHeader(page, /The accounts differ on arrival time/).click();
  await findingsColumn(page)
    .getByRole("button", { name: "Add a note", exact: true })
    .click();
  await page
    .getByLabel("Your review note")
    .fill("Verify the date against the original log.");
  await findingsColumn(page)
    .getByRole("button", { name: "Save note", exact: true })
    .click();
  await expect(
    findingsColumn(page).getByRole("button", { name: "Save note" }),
  ).toHaveCount(0);
  await findingsColumn(page)
    .getByRole("button", { name: "Mark reviewed", exact: true })
    .click();
  await expect(
    findingsColumn(page).getByRole("button", {
      name: "Reopen for review",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(`1 of ${SEED.findings} reviewed`, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: SEED.hearingTitle }),
  ).toBeVisible();
  await findingHeader(page, /The accounts differ on arrival time/).click();
  await expect(page.getByLabel("Your review note")).toHaveValue(
    "Verify the date against the original log.",
  );
  await findingFilter(page, "To review").click();
  await expect(
    findingHeader(page, /The accounts differ on arrival time/),
  ).toHaveCount(0);
  await expect(findingsColumn(page).locator("article")).toHaveCount(
    SEED.findings - 1,
  );
  await findingFilter(page, "All").click();
  await findingHeader(page, /Both accounts name the supervisor/).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("Denied")) },
      configurable: true,
    }),
  );
  await findingsColumn(page)
    .getByRole("button", { name: "Copy question" })
    .click();
  await expect(
    findingsColumn(page).getByRole("button", { name: "Copy question" }),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.resolve() },
      configurable: true,
    }),
  );
  await findingsColumn(page)
    .getByRole("button", { name: "Copy question" })
    .click();
  await expect(
    findingsColumn(page).getByRole("button", { name: "Copied" }),
  ).toBeVisible();
  await expect(
    findingsColumn(page).getByRole("link", { name: "Download original" }),
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
  await expect
    .poll(() => new URL(page.url()).searchParams.get("view"))
    .toBe("settings");
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
  await createCase(page, "Acceptance isolated case");
  await page.getByRole("tab", { name: "Hearings", exact: true }).click();
  await page.getByRole("button", { name: "New hearing", exact: true }).click();
  await page
    .getByLabel("Hearing title", { exact: true })
    .fill("Witness examination");
  await page
    .getByRole("button", { name: "Create hearing", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Witness examination" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More actions" }).click();
  // Without AI or speech providers those actions stay visible but unavailable.
  await expect(
    page.getByRole("menuitem", { name: "Analyze hearing" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("menuitem", { name: "Choose audio file" }),
  ).toBeDisabled();
  await page.getByRole("menuitem", { name: "Add transcript text" }).click();
  await page
    .getByLabel("Finalized statement")
    .fill("The witness arrived at ten in the morning.");
  await page.getByRole("button", { name: "Save & examine" }).click();
  await expect(page.getByLabel("Finalized statement")).toBeHidden();
  await expect(
    page
      .getByRole("region", { name: /^Transcript/ })
      .getByText("The witness arrived at ten in the morning."),
  ).toBeVisible();
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
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Hearings", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Evidence", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Evidence", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const evidence = page.getByRole("tabpanel");
  const stat = (name: string) =>
    evidence
      .getByRole("group", { name: "Filter connections" })
      .getByRole("button", { name: new RegExp(`${name}$`) });
  await page
    .getByRole("button", { name: "Find connections", exact: true })
    .click();
  await page.getByText("Suggested links are ready", { exact: false }).waitFor();
  // The list reloads after the notice; the button settles once it has.
  await expect(
    page.getByRole("button", { name: "Find connections", exact: true }),
  ).toBeEnabled();
  await expect(stat("All connections")).toHaveAttribute("aria-pressed", "true");
  const cards = evidence.getByRole("listitem");
  const total = await cards.count();
  expect(total).toBeGreaterThan(0);
  await stat("Differ").click();
  await expect(stat("Differ")).toHaveAttribute("aria-pressed", "true");
  await expect(cards.first()).toContainText("loading door");
  await stat("All connections").click();
  await expect(cards).toHaveCount(total);
  await evidence
    .getByRole("searchbox", { name: "Search connections, names or quotes…" })
    .fill("locked all day");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("The loading door was locked all day.");
  await evidence
    .getByRole("searchbox", { name: "Search connections, names or quotes…" })
    .fill("no such connection anywhere");
  await expect(
    evidence.getByText("Nothing matches this filter.", { exact: true }),
  ).toBeVisible();
  await evidence
    .getByRole("searchbox", { name: "Search connections, names or quotes…" })
    .fill("");
  await expect(cards).toHaveCount(total);
  const unconfirmed = Number(
    await stat("Not yet confirmed").locator("b").innerText(),
  );
  expect(unconfirmed).toBeGreaterThan(0);
  await expect(
    evidence.getByRole("button", { name: "Reopen connection", exact: true }),
  ).toHaveCount(0);
  await evidence
    .getByRole("button", { name: "Confirm connection", exact: true })
    .first()
    .click();
  await expect(
    evidence.getByRole("button", { name: "Reopen connection", exact: true }),
  ).toHaveCount(1);
  await expect(stat("Not yet confirmed").locator("b")).toHaveText(
    `${unconfirmed - 1}`,
  );
  // Asking about a connection opens the assistant with that material attached.
  await cards
    .first()
    .getByRole("button", { name: "Ask Jude", exact: true })
    .click();
  const dock = page.getByRole("region", { name: "Jude assistant" });
  const attached = dock.getByRole("button", {
    name: "Witness ↔ synthetic-inspection-log.txt · Page 1",
  });
  await expect(attached).toHaveAttribute("aria-pressed", "true");
  await expect(
    dock.getByLabel("Message to the assistant", { exact: true }),
  ).toHaveValue(
    "Compare these two passages. Do they agree, differ, or need more context?",
  );
  await attached.click();
  await expect(attached).toHaveCount(0);
  await dock.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dock).toHaveCount(0);
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
  // Phones show one pane at a time; switch to the highlights.
  await page
    .getByRole("group", { name: "Hearing view" })
    .getByRole("button", { name: /^Jude highlights/ })
    .click();
  await findingHeader(page, /Both accounts name the supervisor/).click();
  await expect(
    findingHeader(page, /Both accounts name the supervisor/),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    findingsColumn(page).getByRole("button", { name: "Mark reviewed" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await findingHeader(page, /Both accounts name the supervisor/).click();
  await expect(
    findingHeader(page, /Both accounts name the supervisor/),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    findingHeader(page, /Both accounts name the supervisor/),
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
  await page.getByRole("button", { name: "More actions" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Analyze hearing", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("menuitem", { name: "Export hearing" }),
  ).toHaveAttribute("href", /\/hearings\/.+\/export\.jude$/);
  await page.getByRole("button", { name: "All hearings", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
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
  expect(caseParam(page)).toBe(copies[0].id);
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
  await findingHeader(page, /The accounts differ on arrival time/).click();
  await expect(page.getByLabel("Your review note")).toHaveValue(
    "Verify the date against the original log.",
  );
  await findingsColumn(page).getByText("Uncertainty and review").click();
  await expect(
    findingsColumn(page).getByText(
      "Imported finding · verify against the original sources",
    ),
  ).toBeVisible();
  await findingFilter(page, "To review").click();
  for (let i = 0; i < SEED.findings; i++) {
    const next = findingsColumn(page).locator("article").first();
    if (
      (await next.getByRole("button").first().getAttribute("aria-expanded")) !==
      "true"
    )
      await next.getByRole("button").first().click();
    await next
      .getByRole("button", { name: "Mark reviewed", exact: true })
      .click();
    await expect(findingsColumn(page).locator("article")).toHaveCount(
      SEED.findings - i - 1,
    );
  }
  await expect(
    page.getByText(`${SEED.findings} of ${SEED.findings} reviewed`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    findingsColumn(page).getByRole("heading", {
      name: "No findings in this view.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All hearings", exact: true }).click();
  await page.getByRole("button", { name: "Needs review", exact: true }).click();
  await expect(page.getByText("No hearings match this view.")).toBeVisible();
  expect(errors).toEqual([]);
});
