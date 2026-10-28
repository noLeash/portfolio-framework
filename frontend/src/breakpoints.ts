import { useEffect, useState } from "react";

// Device breakpoints for the whole site. Keep in sync with
// styles/_breakpoints.scss, which the stylesheets use for the same queries.
//
//   phone    up to 743px   (every phone in portrait; iPad mini portrait is 744)
//   tablet   744–1023px    (iPads in portrait)
//   desktop  1024px and up (iPads in landscape, laptops)
export const PHONE_MAX = 768;
export const DESKTOP_MIN = 1024;

export const PHONE = `(max-width: ${PHONE_MAX}px)`;
export const TABLET = `(min-width: ${PHONE_MAX + 1}px) and (max-width: ${DESKTOP_MIN - 1}px)`;
export const TABLET_UP = `(min-width: ${PHONE_MAX + 1}px)`;
export const DESKTOP = `(min-width: ${DESKTOP_MIN}px)`;

// Whether a media query matches right now, kept up to date as the window resizes
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
};
