"use client";

import { useEffect, type RefObject } from "react";

/** Animate the original composition without changing its static presentation. */
export function useLandingMotion(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const paper = root.current?.querySelector<HTMLElement>(".hero-evidence");
    if (!paper) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    let started = false;
    let visible = false;

    const sync = () => {
      if (preference.matches) {
        animations.forEach((animation) => animation.cancel());
        return;
      }
      if (visible && !document.hidden && !started) {
        started = true;
        animations.push(
          paper.animate(
            [
              { transform: "translateY(12px) rotate(-0.6deg)" },
              { transform: "translateY(4px) rotate(0.2deg)", offset: 0.55 },
              { transform: "none" },
            ],
            { duration: 1100, easing: "steps(4, end)" },
          ),
        );
        const thread = paper.querySelector<HTMLElement>(".evidence-thread");
        const status = paper.querySelector<HTMLElement>(
          ".comparison-finding .status",
        );
        if (thread)
          animations.push(
            thread.animate(
              [
                { transform: "scaleX(0.45)", opacity: 0.35 },
                { transform: "scaleX(1)", opacity: 1 },
              ],
              {
                duration: 900,
                delay: 350,
                fill: "backwards",
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              },
            ),
          );
        if (status)
          animations.push(
            status.animate([{ opacity: 0.65 }, { opacity: 1 }], {
              duration: 550,
              delay: 750,
              fill: "backwards",
              easing: "ease-out",
            }),
          );
      }
      animations.forEach((animation) => {
        if ((!visible || document.hidden) && animation.playState === "running")
          animation.pause();
        else if (
          visible &&
          !document.hidden &&
          animation.playState === "paused"
        )
          animation.play();
      });
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
        sync();
      },
      { threshold: [0, 0.2] },
    );
    observer.observe(paper);
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      animations.forEach((animation) => animation.cancel());
    };
  }, [root]);
}
