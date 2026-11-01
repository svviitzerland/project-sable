/** A finite source-comparison sequence. Content stays readable without motion or JS. */
export function landingMotion(root: HTMLDivElement | null) {
  if (!root) return;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const easing = "cubic-bezier(0.16, 1, 0.3, 1)";
  type Sequence = {
    element: HTMLElement;
    visible: boolean;
    started: boolean;
    animations: Animation[];
    play: () => void;
  };
  const sequences: Sequence[] = [];
  function sequence(
    element: HTMLElement | null,
    play: (
      animate: (
        target: Element | null,
        frames: Keyframe[],
        duration: number,
        delay?: number,
      ) => void,
    ) => void,
  ) {
    if (!element) return;
    const item: Sequence = {
      element,
      visible: false,
      started: false,
      animations: [],
      play: () => {
        item.animations.forEach((animation) => animation.cancel());
        item.animations = [];
        item.started = true;
        if (preference.matches) return;
        play((target, frames, duration, delay = 0) => {
          if (target)
            item.animations.push(
              target.animate(frames, {
                duration,
                delay,
                easing,
                fill: "backwards",
              }),
            );
        });
      },
    };
    sequences.push(item);
    return item;
  }
  sequence(root.querySelector<HTMLElement>(".hero-copy"), (animate) => {
    animate(
      root.querySelector(".hero-copy h1"),
      [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }],
      850,
    );
    animate(
      root.querySelector(".hero-actions"),
      [
        { opacity: 0.4, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      550,
      250,
    );
  });
  const paper = root.querySelector<HTMLElement>(".hero-evidence");
  const comparison = sequence(paper, (animate) => {
    animate(
      paper,
      [{ transform: "translateY(18px)" }, { transform: "none" }],
      850,
    );
    const highlights = paper!.querySelectorAll(".quote-highlight");
    highlights.forEach((mark, index) =>
      animate(
        mark,
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        700,
        400 + index * 900,
      ),
    );
    animate(
      paper!.querySelector(".evidence-thread"),
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
      1000,
      1000,
    );
    animate(
      paper!.querySelector(".comparison-finding .status"),
      [
        { opacity: 0.35, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" },
      ],
      650,
      2100,
    );
    animate(
      paper!.querySelector(".comparison-finding > p"),
      [{ opacity: 0.35 }, { opacity: 1 }],
      500,
      2550,
    );
    animate(
      paper!.querySelector(".comparison-progress"),
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      3200,
    );
  });
  const workflow =
    root.closest("main")?.querySelector<HTMLElement>(".workflow-list") ?? null;
  sequence(workflow, (animate) => {
    workflow!
      .querySelectorAll(".workflow-detail svg")
      .forEach((arrow, index) => {
        animate(
          arrow,
          [
            { transform: "translateX(-12px)", opacity: 0.25 },
            { transform: "translateX(0)", opacity: 1 },
          ],
          650,
          index * 350,
        );
      });
    workflow!.querySelectorAll(".step-number").forEach((number, index) => {
      animate(
        number,
        [{ color: "#a66e27" }, { color: "#657164" }],
        1000,
        index * 350,
      );
    });
  });
  function sync() {
    for (const item of sequences) {
      if (preference.matches) {
        item.animations.forEach((animation) => animation.cancel());
        continue;
      }
      if (item.visible && !document.hidden && !item.started) item.play();
      for (const animation of item.animations) {
        if (
          (!item.visible || document.hidden) &&
          animation.playState === "running"
        )
          animation.pause();
        else if (
          item.visible &&
          !document.hidden &&
          animation.playState === "paused"
        )
          animation.play();
      }
    }
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const item = sequences.find(
          (candidate) => candidate.element === entry.target,
        );
        if (item)
          item.visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
      }
      sync();
    },
    { threshold: [0, 0.2] },
  );
  sequences.forEach((item) => observer.observe(item.element));
  preference.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  return {
    replay: () => {
      comparison?.play();
      sync();
    },
    destroy: () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      sequences.forEach((item) =>
        item.animations.forEach((animation) => animation.cancel()),
      );
    },
  };
}
