import { test, expect, type Page } from "@playwright/test";
import { createCase, register, uploadDocument } from "./helpers";
test("case assistant and AI-only courtroom practice with coaching and debrief", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await register(page);
  // Build the case through the UI so the flow does not depend on demo content.
  await createCase(page, "Assistant practice case");
  await uploadDocument(
    page,
    "witness-statement.txt",
    "Synthetic witness statement. The witness says she arrived at the warehouse at nine in the morning and saw the receipt on the desk.",
  );
  await page.getByRole("tab", { name: "Evidence", exact: true }).click();
  await page
    .getByRole("button", { name: "witness-statement.txt", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: "Discuss with assistant" }).click();
  await expect(
    page.getByRole("tab", { name: "Case assistant", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", {
      name: "Remove source: Selected evidence passage",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sources (1)" }).click();
  await expect(
    page.getByLabel("Selected evidence passage", { exact: true }),
  ).toBeChecked();
  await page
    .getByLabel("Ask about this case", { exact: true })
    .fill("What does the statement say about arrival time?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("AI replies are unavailable", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Sources cited" })
    .first()
    .getByRole("button")
    .first()
    .click();
  await expect(
    page.getByRole("link", { name: "Open original", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("log").locator("blockquote").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Sources/ }).click();
  await expect(page.getByLabel("Legal search terms")).toBeDisabled();
  await page
    .getByLabel("Ask about this case", { exact: true })
    .fill("What other context is available?");
  await page.route(
    "**/dialogues/*/messages",
    (route) =>
      route.fulfill({
        status: 503,
        json: {
          detail: "Provider temporarily unavailable. Retry your message.",
        },
      }),
    { times: 1 },
  );
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Provider temporarily unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Ask about this case", { exact: true }),
  ).toHaveValue("What other context is available?");
  await expect(page.getByRole("log").locator("article")).toHaveCount(2);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(4);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export conversation" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await page.reload();
  await page.getByRole("tab", { name: "Case assistant", exact: true }).click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(4);
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(
    page.getByRole("textbox", { name: "Ask about this case", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("log").locator("article")).toHaveCount(0);
  await page.getByRole("button", { name: /^History/ }).click();
  await page
    .getByRole("button", { name: "What does the statement say", exact: false })
    .click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page
    .getByRole("tab", { name: "Courtroom practice", exact: true })
    .click();
  // Without an AI provider practice is unavailable; there is no scripted drill.
  await expect(
    page.getByRole("heading", { name: "Courtroom practice needs AI." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start rehearsal" }),
  ).toHaveCount(0);
  await expect(page.getByText(/guided drill|scripted prompts/i)).toHaveCount(0);

  // Browser tests run without AI providers: simulate a configured workspace
  // and the practice API at the network level.
  const sent = mockPractice(page);
  await page.route("**/api/v1/capabilities", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.analysis = { configured: true, note: "" };
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page
    .getByRole("tab", { name: "Courtroom practice", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Defense counsel" }),
  ).toBeChecked();
  await expect(
    page.getByText("AI plays the bench, the prosecutor and the witness."),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Judge" }).check();
  await page.getByRole("button", { name: "Change conditions" }).click();
  await page.getByRole("button", { name: "Suggest from case" }).click();
  await expect(
    page.getByText("Witness arrival time is the main open question.").first(),
  ).toBeVisible();
  await expect(page.getByLabel("Stage", { exact: false })).toHaveValue(
    "Cross-examination",
  );
  await page
    .getByLabel("Trial type", { exact: true })
    .fill("Civil hearing practice");
  await page
    .getByLabel("Jurisdiction / court")
    .fill("Practice court — verify local procedure");
  await page.getByLabel("Difficulty").selectOption("Challenging");
  await page
    .getByLabel("Scenario assumptions and ground rules")
    .fill(
      "Hypothetical hearing with two counsel; no additional witness facts assumed.",
    );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Start rehearsal" }).click();
  await expect(
    page.getByText("You are practising as Judge", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByText("Trial conditions", { exact: true }).click();
  await expect(
    page.getByText("Civil hearing practice", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Your turn · Judge", exact: true })
    .fill("Witness, when did you arrive and what did you see?");
  await page.getByRole("button", { name: "Take your turn" }).click();
  const log = page.getByRole("log");
  await expect(
    log.getByRole("heading", { name: "Witness · Dewi Lestari" }),
  ).toBeVisible();
  await expect(
    log.getByRole("heading", { name: "Opposing counsel" }),
  ).toBeVisible();
  const coach = log.getByRole("complementary", { name: "Coaching note" });
  await expect(coach).toContainText("Compound question.");
  expect(sent.at(-1)?.coaching).toBe(true);
  await log
    .getByRole("group", { name: "Sources cited" })
    .last()
    .getByRole("button")
    .first()
    .click();
  await expect(log.locator("blockquote").last()).toContainText(
    "arrived at the warehouse at nine",
  );
  await page.getByRole("button", { name: "Coaching", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Coaching", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("textbox", { name: "Your turn · Judge", exact: true })
    .fill("Counsel, any further questions?");
  await page.getByRole("button", { name: "Take your turn" }).click();
  await expect(log.locator("article")).toHaveCount(6);
  expect(sent.at(-1)?.coaching).toBe(false);
  await expect(coach).toHaveCount(1);
  await page.getByRole("button", { name: "Finish & see debrief" }).click();
  await expect(
    page.getByText("Rehearsal complete. Your dialogue and debrief are saved."),
  ).toBeVisible();
  await expect(log.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await expect(
    log.getByRole("heading", { name: "What to tighten" }),
  ).toBeVisible();
  await expect(
    log.getByRole("heading", { name: "Passages to revisit" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.reload();
  await page
    .getByRole("tab", { name: "Courtroom practice", exact: true })
    .click();
  await expect(
    page.getByText("Rehearsal complete.", { exact: false }),
  ).toBeVisible();
  await expect(log.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await page.getByText("Trial conditions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Edit setup for a new rehearsal" })
    .click();
  await expect(page.getByLabel("Trial type", { exact: true })).toHaveValue(
    "Civil hearing practice",
  );
  await expect(page.getByRole("radio", { name: "Judge" })).toBeChecked();
  await page.getByRole("radio", { name: "Opposing counsel" }).check();
  await page.getByRole("button", { name: "Start rehearsal" }).click();
  await expect(
    page.getByRole("textbox", {
      name: "Your turn · Opposing counsel",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

/**
 * An in-memory practice API: AI rehearsal needs a provider, which browser tests
 * do not have. Returns the message bodies the page sent.
 */
function mockPractice(page: Page) {
  const sent: { text: string; coaching?: boolean; finish?: boolean }[] = [];
  const sessions = new Map<string, Record<string, unknown>>();
  let counter = 0;
  const id = () => `mock-${++counter}`;
  const source = {
    chunk_id: "mock-passage",
    kind: "document",
    title: "witness-statement.txt",
    text: "Synthetic witness statement. The witness says she arrived at the warehouse at nine in the morning and saw the receipt on the desk.",
    document_id: null,
    page: 1,
    hearing_id: null,
  };
  const message = (
    role: string,
    speaker: string,
    text: string,
    cited = false,
  ) => ({
    id: id(),
    role,
    speaker,
    text,
    notice: "",
    legal: [],
    citations: cited
      ? [
          {
            chunk_id: source.chunk_id,
            quote: "arrived at the warehouse at nine",
            relation: "supports",
            source,
          },
        ]
      : [],
  });
  void page.route("**/api/v1/cases/*/practice/propose", (route) =>
    route.fulfill({
      json: {
        conditions: {
          ...route.request().postDataJSON(),
          stage: "Cross-examination",
        },
        rationale: "Witness arrival time is the main open question.",
      },
    }),
  );
  void page.route("**/api/v1/cases/*/dialogues**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      parts = url.pathname.split("/dialogues")[1].split("/").filter(Boolean);
    if (!parts.length && request.method() === "GET") {
      if (url.searchParams.get("kind") !== "practice") return route.fallback();
      return route.fulfill({
        json: [...sessions.values()]
          .reverse()
          .map((s) => ({ ...s, messages: undefined })),
      });
    }
    if (!parts.length && request.method() === "POST") {
      const body = request.postDataJSON();
      if (body.kind !== "practice") return route.fallback();
      const session = {
        id: id(),
        kind: "practice",
        title: `${body.conditions.stage} · ${body.conditions.user_role}`,
        mode: "ai",
        status: "active",
        conditions: body.conditions,
        created_at: new Date(Date.now() + counter).toISOString(),
        messages: [message("scene", "Practice facilitator", "Scene")],
      };
      sessions.set(session.id, session);
      return route.fulfill({ json: session });
    }
    const session = sessions.get(parts[0]);
    if (!session) return route.fallback();
    const messages = session.messages as ReturnType<typeof message>[];
    if (parts[1] === "messages") {
      const body = request.postDataJSON();
      sent.push(body);
      messages.push(message("user", "judge", body.text));
      if (body.finish) {
        session.status = "complete";
        messages.push(
          message("debrief", "summary", "A focused session."),
          message("debrief", "strength", "Clear control of the hearing."),
          message("debrief", "tighten", "Ask one question at a time."),
          message("debrief", "revisit", "The arrival time.", true),
        );
      } else {
        if (body.coaching)
          messages.push(
            message("coach", "compound", "Split this into two questions."),
          );
        messages.push(
          message("assistant", "opposing", "Objection, Your Honour: compound."),
          message(
            "assistant",
            "witness:Dewi Lestari",
            "I arrived at the warehouse at nine.",
            true,
          ),
        );
      }
    }
    return route.fulfill({ json: session });
  });
  return sent;
}
