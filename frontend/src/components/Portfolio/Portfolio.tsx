import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { useFetch } from "../hooks/useFetch";
import type { PortfolioMedia } from "./usePortfolio";
import VideoPlayer from "./VideoPlayer";
import { imageSizesForHeight, imageSrcSet } from "./mediaImage";
import { PHONE, useMediaQuery } from "../../breakpoints";
import "../../styles/Components/portfolio.scss";

type DisplayPortfolio = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  style: Record<string, unknown>;
  media: PortfolioMedia[];
};

// Assets this far into the strip load immediately; the rest load as they near the viewport
const EAGER_COUNT = 2;

const MediaItem = ({ item, eager }: { item: PortfolioMedia; eager: boolean }) => {
  if (item.mediaType === "video") {
    return (
      <VideoPlayer
        src={item.originalUrl}
        poster={item.largeUrl}
        width={item.originalWidth}
        height={item.originalHeight}
        title={item.altText || item.filename}
      />
    );
  }

  return (
    <img
      src={item.largeUrl ?? item.originalUrl}
      srcSet={imageSrcSet(item) || undefined}
      // full width on phones (vertical), full height elsewhere (horizontal strip)
      sizes={`${PHONE} 100vw, ${imageSizesForHeight(item.originalWidth, item.originalHeight, 100)}`}
      alt={item.altText ?? ""}
      // width/height reserve the right space before the file arrives
      width={item.originalWidth ?? undefined}
      height={item.originalHeight ?? undefined}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      draggable={false}
    />
  );
};

const Portfolio = () => {
  const { portfolioSlug } = useParams<{ portfolioSlug: string }>();
  const { data, loading, error } = useFetch<DisplayPortfolio>({
    url: `/api/portfolio/${portfolioSlug}`,
    skip: !portfolioSlug,
  });
  const stripRef = useRef<HTMLDivElement>(null);
  // Phones scroll the gallery vertically; tablets and up get the horizontal strip
  const isPhone = useMediaQuery(PHONE);

  // Vertical scrolling anywhere on the page (mouse wheel or trackpad) moves
  // the strip sideways: down scrolls forward, up scrolls back.
  // Sideways trackpad swipes are left to the browser.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || isPhone) return;
    const onWheel = (e: WheelEvent) => {
      // ctrl+wheel is pinch-zoom on trackpads
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      // deltaMode 1 = lines (Firefox mouse wheels), 2 = pages, 0 = pixels
      const scale =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? strip.clientWidth : 1;
      strip.scrollLeft += e.deltaY * scale;
    };
    // Must be non-passive to preventDefault; React's onWheel is passive
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [data, isPhone]);

  if (loading) return <div className="portfolio-status">Loading…</div>;
  if (error || !data) {
    return <div className="portfolio-status">Portfolio not found.</div>;
  }

  return (
    <div
      // a fresh element per portfolio, so the strip starts at the beginning
      key={data.slug}
      ref={stripRef}
      className="portfolio-strip"
      tabIndex={0}
      role="region"
      aria-label={`${data.name ?? "Portfolio"} gallery`}
    >
      <header className="portfolio-strip__intro">
        <h1>{data.name}</h1>
        {data.description && <p>{data.description}</p>}
        {data.media.length > 0 && (
          <span className="portfolio-strip__hint" aria-hidden>
            Scroll {isPhone ? "↓" : "→"}
          </span>
        )}
      </header>

      {data.media.length ? (
        data.media.map((item, index) => (
          <figure key={item.id} className="portfolio-strip__item">
            <MediaItem item={item} eager={index < EAGER_COUNT} />
            {item.description && <figcaption>{item.description}</figcaption>}
          </figure>
        ))
      ) : (
        <p className="portfolio-strip__empty">Nothing here yet.</p>
      )}
    </div>
  );
};

export default Portfolio;
