"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 200;

export function BackToTopButton() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className="fixed bottom-24 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-lg transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ArrowUp className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
