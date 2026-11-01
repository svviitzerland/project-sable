import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { t } from "./i18n/index.svelte";
import type { MessageKey } from "./i18n/core";

/**
 * First-run guided tour (driver.js). Steps point at `data-tour` anchors; steps whose
 * anchor is not on screen (for example case tabs before a case is open, or the sidebar
 * on a phone) are skipped. Completion is remembered per browser; the help button replays it.
 */
const SEEN = "jude.tour.v1";
const steps: { anchor?: string; title: MessageKey; text: MessageKey }[] = [
  { title: "tour.welcome.title", text: "tour.welcome.text" },
  {
    anchor: "new-case",
    title: "tour.newCase.title",
    text: "tour.newCase.text",
  },
  { anchor: "import", title: "tour.import.title", text: "tour.import.text" },
  {
    anchor: "tab-documents",
    title: "tour.documents.title",
    text: "tour.documents.text",
  },
  {
    anchor: "tab-hearing",
    title: "tour.hearing.title",
    text: "tour.hearing.text",
  },
  {
    anchor: "tab-evidence",
    title: "tour.evidence.title",
    text: "tour.evidence.text",
  },
  {
    anchor: "tab-assistant",
    title: "tour.assistant.title",
    text: "tour.assistant.text",
  },
  {
    anchor: "tab-practice",
    title: "tour.practice.title",
    text: "tour.practice.text",
  },
  {
    anchor: "language",
    title: "tour.language.title",
    text: "tour.language.text",
  },
  { anchor: "help", title: "tour.help.title", text: "tour.help.text" },
];

function visible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

export function startTour() {
  const drive: DriveStep[] = steps.flatMap((step) => {
    const popover = { title: t(step.title), description: t(step.text) };
    if (!step.anchor) return [{ popover }];
    const element = document.querySelector(`[data-tour="${step.anchor}"]`);
    return visible(element) ? [{ element, popover }] : [];
  });
  const tour = driver({
    showProgress: true,
    allowClose: true,
    smoothScroll: true,
    stagePadding: 6,
    popoverClass: "jude-tour",
    nextBtnText: t("tour.next"),
    prevBtnText: t("tour.back"),
    doneBtnText: t("tour.done"),
    progressText: t("tour.progress"),
    steps: drive,
    onDestroyed: () => {
      try {
        localStorage.setItem(SEEN, "1");
      } catch {
        /* Private mode: the tour simply shows again next time. */
      }
    },
  });
  tour.drive();
}

/** Start once for a new browser. */
export function maybeStartTour() {
  // Automated browsers (Playwright) never get an overlay that would block their clicks.
  if (navigator.webdriver) return;
  try {
    if (localStorage.getItem(SEEN)) return;
  } catch {
    return;
  }
  // Let the workspace finish rendering its anchors.
  setTimeout(startTour, 600);
}
