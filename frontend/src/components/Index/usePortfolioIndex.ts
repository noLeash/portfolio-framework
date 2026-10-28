import { useFetch } from "../hooks/useFetch";
import type { PortfolioMedia } from "../Portfolio/usePortfolio";

// Mirrors IndexPortfolioSchema in backend schema/portfolios.py
export type IndexPortfolio = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  // the chosen primary media, else the first image
  coverMedia: PortfolioMedia | null;
};

// Mirrors PortfolioIndexSchema
export type PortfolioIndex = {
  groups: { id: string; name: string; portfolios: IndexPortfolio[] }[];
  ungrouped: IndexPortfolio[];
};

// Published portfolios by group; backs the index sidebar and the /index page
export const usePortfolioIndex = ({ manual = false } = {}) =>
  useFetch<PortfolioIndex>({ url: "/api/portfolio/index", manual });
