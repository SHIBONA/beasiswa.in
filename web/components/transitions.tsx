"use client";

import { startTransition, ViewTransition, type ReactNode } from "react";

// The type names come from NAV in lib/nav.ts.
// Wraps each page (never a layout, which persists and would never enter or exit).
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", "nav-lateral": "fade-in", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", "nav-lateral": "fade-out", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

// Content that arrives after a fetch or a new agent step. The loading text it replaces snaps out live.
export function Reveal({ children }: { children: ReactNode }) {
  return <ViewTransition enter="reveal" default="none">{children}</ViewTransition>;
}

// One item in a list that changes (history rows, saved cards, filtered opportunities): items that leave fade
// out, items that arrive rise in, and the rest move to their new place.
export function ListItem({ children }: { children: ReactNode }) {
  return <ViewTransition enter="reveal" exit="remove" update="auto" default="none">{children}</ViewTransition>;
}

// Data updates that should animate go through here. Browsers refuse view transitions in a hidden tab
// (InvalidStateError), which a background poll on the results page would hit, so hidden tabs just update.
export function animate(update: () => void) {
  if (document.visibilityState === "visible") startTransition(update);
  else update();
}
