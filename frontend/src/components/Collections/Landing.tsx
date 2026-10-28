import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Modal } from "rsuite";
import { RxPlay } from "react-icons/rx";
import { useAuth } from "../hooks/useAuth";
import { imageSizesForHeight, imageSrcSet } from "../Portfolio/mediaImage";
import type { PortfolioMedia } from "../Portfolio/usePortfolio";
import VideoPlayer from "../Portfolio/VideoPlayer";
import { useActiveCollection, type CollectionItem, type DisplaySize } from "./useCollections";
import "../../styles/Components/landing.scss";
import { PHONE } from "../../breakpoints";

// Tile height for each display size, as % of the viewport height.
// Keep in sync with .landing-item--s/m/l in landing.scss
const HEIGHT_VH: Record<DisplaySize, number> = { s: 30, m: 45, l: 70 };

// On phones every tile goes full width except S (two per row)
const NARROW = PHONE;

// Tiles this far into the collage load immediately; the rest load near the viewport
const EAGER_COUNT = 4;

// Share of an inline video that must be on screen before it plays
const INLINE_PLAY_THRESHOLD = 0.25;

const usePrefersReducedMotion = () => {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
};

// Videos without known dimensions fall back to 16:9 so the tile has a width
const aspectStyle = (media: PortfolioMedia) =>
  media.originalWidth && media.originalHeight ? undefined : { aspectRatio: "16 / 9" };

// An image, or a video's poster, sized for its tile
const TileImage = ({
  media,
  displaySize,
  eager,
}: {
  media: PortfolioMedia;
  displaySize: DisplaySize;
  eager: boolean;
}) => {
  const sizes = [
    `${NARROW} ${displaySize === "s" ? "50vw" : "100vw"}`,
    imageSizesForHeight(media.originalWidth, media.originalHeight, HEIGHT_VH[displaySize]),
  ].join(", ");
  return (
    <img
      src={media.largeUrl ?? media.originalUrl}
      srcSet={imageSrcSet(media) || undefined}
      sizes={sizes}
      alt={media.altText ?? ""}
      width={media.originalWidth ?? undefined}
      height={media.originalHeight ?? undefined}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
    />
  );
};

// Muted, looping and silent like a moving image; only plays while on screen
const InlineVideo = ({
  media,
  displaySize,
  eager,
}: {
  media: PortfolioMedia;
  displaySize: DisplaySize;
  eager: boolean;
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Rejected when the browser blocks autoplay; the poster stays up
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: INLINE_PLAY_THRESHOLD },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={media.originalUrl}
      poster={(displaySize === "s" ? media.mediumUrl : media.largeUrl) ?? undefined}
      width={media.originalWidth ?? undefined}
      height={media.originalHeight ?? undefined}
      style={aspectStyle(media)}
      muted
      loop
      playsInline
      preload={eager ? "auto" : "metadata"}
      aria-label={media.altText || undefined}
    />
  );
};

// Poster with a play button; the video opens in a modal player
const ModalVideoTile = ({
  media,
  displaySize,
  eager,
  onPlay,
}: {
  media: PortfolioMedia;
  displaySize: DisplaySize;
  eager: boolean;
  onPlay: () => void;
}) => (
  <button
    type="button"
    className="landing-item__play"
    onClick={onPlay}
    aria-label={`Play video${media.altText ? `: ${media.altText}` : ""}`}
  >
    {media.thumbnailUrl ? (
      <TileImage media={media} displaySize={displaySize} eager={eager} />
    ) : (
      // No poster (the browser couldn't decode it at upload): show the first frame
      <video
        src={media.originalUrl}
        width={media.originalWidth ?? undefined}
        height={media.originalHeight ?? undefined}
        style={aspectStyle(media)}
        preload="metadata"
        muted
        playsInline
      />
    )}
    <span className="landing-item__play-icon" aria-hidden>
      <RxPlay size={28} />
    </span>
  </button>
);

const LandingItem = ({
  item,
  eager,
  reducedMotion,
  onPlayVideo,
}: {
  item: CollectionItem;
  eager: boolean;
  reducedMotion: boolean;
  onPlayVideo: (media: PortfolioMedia) => void;
}) => {
  const { media, displaySize, playbackMode, portfolioName, portfolioSlug } = item;
  const isVideo = media.mediaType === "video";
  // Respect reduced motion: inline videos become click-to-play
  const inline = isVideo && playbackMode === "inline" && !reducedMotion;

  return (
    <figure className={`landing-item landing-item--${displaySize}`}>
      {!isVideo ? (
        <TileImage media={media} displaySize={displaySize} eager={eager} />
      ) : inline ? (
        <InlineVideo media={media} displaySize={displaySize} eager={eager} />
      ) : (
        <ModalVideoTile
          media={media}
          displaySize={displaySize}
          eager={eager}
          onPlay={() => onPlayVideo(media)}
        />
      )}
      {portfolioSlug && (
        <Link
          to={`/${portfolioSlug}`}
          className="landing-item__link"
        >
          View {portfolioName} →
        </Link>
      )}
    </figure>
  );
};

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const { data, loading, error } = useActiveCollection();
  const reducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState<PortfolioMedia | null>(null);

  if (loading) return <div className="landing-status">Loading…</div>;
  if (error || !data || !data.items.length) {
    return (
      <div className="landing-status">
        {isAuthenticated ? (
          <>
            No landing page is live yet.{" "}
            <Link to="/collections">Choose a collection</Link> to show here.
          </>
        ) : (
          "Nothing here yet."
        )}
      </div>
    );
  }

  return (
    <section className="landing" aria-label={data.name}>
      <ul className="landing-collage">
        {data.items.map((item, index) => (
          <li key={item.id}>
            <LandingItem
              item={item}
              eager={index < EAGER_COUNT}
              reducedMotion={reducedMotion}
              onPlayVideo={setPlaying}
            />
          </li>
        ))}
      </ul>

      <Modal open={!!playing} onClose={() => setPlaying(null)} size="lg">
        <Modal.Header>
          <Modal.Title>{playing?.altText || playing?.description || ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {playing && (
            <VideoPlayer
              src={playing.originalUrl}
              poster={playing.largeUrl}
              width={playing.originalWidth}
              height={playing.originalHeight}
              title={playing.altText || playing.filename}
              autoPlay
            />
          )}
        </Modal.Body>
      </Modal>
    </section>
  );
};

export default Landing;
