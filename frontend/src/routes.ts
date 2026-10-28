// src/routes.ts
import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  layout("./routes/app-layout.tsx", [
    index("./routes/home.tsx"),
    route("index", "./components/Index/IndexPage.tsx"),
    route("/about", "./components/About/About.tsx"),
    route("/:portfolioSlug", "./components/Portfolio/Portfolio.tsx"),
    route("login", "./components/Login/Login.tsx"),
    route("portfolios", "./components/Portfolio/PortfolioList.tsx"),
    layout("./routes/protected-layout.tsx", [
      route("dashboard", "./components/AdminDash/AdminDash.tsx"),
      route("edit", "./components/Portfolio/EditPortfolios.tsx"),
      route("edit/:portfolioSlug", "./components/Portfolio/EditPortfolio.tsx"),
      route("collections", "./components/Collections/EditCollections.tsx"),
      route(
        "collections/:collectionId",
        "./components/Collections/EditCollection.tsx",
      ),
    ]),
  ]),
] satisfies RouteConfig;
