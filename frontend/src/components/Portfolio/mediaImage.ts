import type { PortfolioMedia } from "./usePortfolio";

// Longest side the backend resizes each version to, see upload_portfolio_image
const IMAGE_SIZES: [keyof PortfolioMedia, number][] = [
  ["smallUrl", 600],
  ["mediumUrl", 800],
  ["largeUrl", 1964],
];

// Resizing caps the longest side and never upscales, so derive each
// file's real width from the original dimensions when we have them
export const imageSrcSet = (item: PortfolioMedia) => {
  const { originalWidth: w, originalHeight: h } = item;
  const widthFor = (longest: number) =>
    w && h ? Math.round(w * Math.min(1, longest / Math.max(w, h))) : longest;
  return IMAGE_SIZES.filter(([key]) => item[key])
    .map(([key, longest]) => `${item[key]} ${widthFor(longest)}w`)
    .join(", ");
};

// `sizes` for an image displayed `heightVh` tall: its on-screen width is
// heightVh * aspect ratio, capped at the viewport width. Telling the browser
// that width lets it pick the right file from srcSet.
export const imageSizesForHeight = (
  w: number | null,
  h: number | null,
  heightVh: number,
) => {
  if (!w || !h) return "100vw";
  const vhWidth = Math.round(((heightVh * w) / h) * 100) / 100;
  // The width cap kicks in once the viewport's aspect ratio drops below this
  return `(max-aspect-ratio: ${Math.round(heightVh * w)}/${100 * h}) 100vw, ${vhWidth}vh`;
};
