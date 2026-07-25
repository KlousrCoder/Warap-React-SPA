import { Navigate, useParams } from "react-router-dom";

export function ServicesCategoryRedirect() {
  const { category } = useParams();
  const search = new URLSearchParams({ q: "", category: category ?? "", minRating: "0", minPrice: "0", maxPrice: "0", sort: "newest" });
  return <Navigate to={`/services?${search.toString()}`} replace />;
}
