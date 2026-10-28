import { useEffect } from "react";
import { NavLink } from "react-router";
import { usePortfolioIndex, type IndexPortfolio } from "./usePortfolioIndex";

const PortfolioLinks = ({
  portfolios,
  onNavigate,
}: {
  portfolios: IndexPortfolio[];
  onNavigate: () => void;
}) => (
  <ul className="index-sidebar__list">
    {portfolios.map((portfolio) => (
      <li key={portfolio.id}>
        <NavLink to={`/${portfolio.slug}`} onClick={onNavigate}>
          {portfolio.name ?? portfolio.slug}
        </NavLink>
      </li>
    ))}
  </ul>
);

// Published portfolios by group, opened from "Index" in the site header
export default function IndexSidebar({
  id,
  open,
  onClose,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, loading, error, refetch } = usePortfolioIndex({ manual: true });

  // Reload on every open so newly published portfolios show up
  useEffect(() => {
    if (!open) return;
    refetch().catch(() => {});
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isEmpty = data && !data.groups.length && !data.ungrouped.length;

  return (
    <aside
      id={id}
      className={`index-sidebar${open ? " is-open" : ""}`}
      aria-label="Portfolio index"
      aria-hidden={!open}
      inert={!open}
    >
      <NavLink to="/index" className="index-sidebar__all" onClick={onClose}>
        View all projects →
      </NavLink>
      {loading && !data && <p className="index-sidebar__status">Loading…</p>}
      {error && <p className="index-sidebar__status">Couldn't load the index.</p>}
      {isEmpty && <p className="index-sidebar__status">Nothing published yet.</p>}
      {data?.groups.map((group) => (
        <section key={group.id} className="index-sidebar__group">
          <h3>{group.name}</h3>
          <PortfolioLinks portfolios={group.portfolios} onNavigate={onClose} />
        </section>
      ))}
      {!!data?.ungrouped.length && (
        <section className="index-sidebar__group">
          {!!data.groups.length && <h3>Other</h3>}
          <PortfolioLinks portfolios={data.ungrouped} onNavigate={onClose} />
        </section>
      )}
    </aside>
  );
}
