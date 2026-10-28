import { Link } from "react-router";
import { imageSrcSet } from "../Portfolio/mediaImage";
import { usePortfolioIndex, type IndexPortfolio } from "./usePortfolioIndex";
import { DESKTOP, PHONE } from "../../breakpoints";
import "../../styles/Components/index.scss";

// Cards this far into the list load immediately; the rest load near the viewport
const EAGER_COUNT = 6;

// Cover width per device; matches the column counts in index.scss
const CARD_SIZES = `${PHONE} 100vw, ${DESKTOP} 33vw, 50vw`;

const ProjectCard = ({
  portfolio,
  eager,
}: {
  portfolio: IndexPortfolio;
  eager: boolean;
}) => {
  const cover = portfolio.coverMedia;
  return (
    <Link to={`/${portfolio.slug}`} className="index-card">
      <div className="index-card__cover">
        {cover && (
          <img
            src={cover.mediumUrl ?? cover.largeUrl ?? cover.originalUrl}
            srcSet={imageSrcSet(cover) || undefined}
            sizes={CARD_SIZES}
            alt={cover.altText ?? ""}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        )}
      </div>
      <span className="index-card__label">{portfolio.name ?? portfolio.slug}</span>
    </Link>
  );
};

// Every published project with its cover image, in group order
export default function IndexPage() {
  const { data, loading, error } = usePortfolioIndex();

  if (loading) return <div className="index-status">Loading…</div>;
  if (error || !data) {
    return <div className="index-status">Couldn't load the index.</div>;
  }

  const portfolios = [
    ...data.groups.flatMap((group) => group.portfolios),
    ...data.ungrouped,
  ];
  if (!portfolios.length) {
    return <div className="index-status">Nothing published yet.</div>;
  }

  return (
    <div className="index-page">
      <h2 className="visually-hidden">Index</h2>
      <ul className="index-grid">
        {portfolios.map((portfolio, index) => (
          <li key={portfolio.id}>
            <ProjectCard portfolio={portfolio} eager={index < EAGER_COUNT} />
          </li>
        ))}
      </ul>
    </div>
  );
}
