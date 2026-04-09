import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twemoji: {
      parse: (el: HTMLElement | string, opts?: object) => string;
    };
  }
}

const TWEMOJI_OPTS = {
  folder: "svg",
  ext: ".svg",
  base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",
  attributes: () => ({ style: "height:1.2em;width:1.2em;vertical-align:-0.2em;display:inline-block" }),
};

export function useEmoji(deps: unknown[] = []) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && window.twemoji) {
      window.twemoji.parse(ref.current, TWEMOJI_OPTS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
