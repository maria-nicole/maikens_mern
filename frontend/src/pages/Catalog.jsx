import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import CatalogHeader from "../components/catalog/CatalogHeader";
import CatalogToolbar from "../components/catalog/CatalogToolbar";
import FilterSidebar from "../components/catalog/FilterSidebar";
import ActiveFilters from "../components/catalog/ActiveFilters";
import ProductGrid from "../components/catalog/ProductGrid";
import Pagination from "../components/catalog/Pagination";
import Footer from "../components/Footer";
import {
  API_URL,
  EMPTY_SELECTION,
  FILTER_GROUPS,
  PALETTE_OPTIONS,
  colorOptionsFrom,
  normalizeProduct,
} from "../components/catalog/catalogConfig";

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [viewMode, setViewMode] = useState("grid");
  const [show, setShow] = useState(16);
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState(EMPTY_SELECTION);
  const [filterOpen, setFilterOpen] = useState(false); // mobile drawer
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch the catalog (GET /api/products). The server already hides drafts and archived items.
  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await axios.get(`${API_URL}/api/products`);
        if (!Array.isArray(res.data)) throw new Error("Unexpected response from the server");
        if (!ignore) setProducts(res.data.map(normalizeProduct));
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setProducts([]);
          setLoadError("Couldn't load the catalog. Make sure the backend is running, then refresh.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadProducts();
    return () => {
      ignore = true;
    };
  }, []);

  // The Color filter is built from what the products actually carry, so a shade the admin
  // added in the product form can be filtered too. The palette is the safe fallback.
  const filterGroups = useMemo(() => {
    const carried = colorOptionsFrom(products);
    const colorOptions = carried.length > 0 ? carried : PALETTE_OPTIONS;
    return FILTER_GROUPS.map((group) => (group.key === "color" ? { ...group, options: colorOptions } : group));
  }, [products]);

  // Back to page 1 whenever the result set could change shape
  useEffect(() => {
    setCurrentPage(1);
  }, [selected, searchTerm, sortBy, show]);

  const toggleFilter = (groupKey, option) => {
    setSelected((prev) => {
      const current = prev[groupKey];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      return { ...prev, [groupKey]: next };
    });
  };

  const removeFilter = (groupKey, option) =>
    setSelected((prev) => ({ ...prev, [groupKey]: prev[groupKey].filter((o) => o !== option) }));

  const clearFilters = () => setSelected(EMPTY_SELECTION);

  const clearAll = () => {
    clearFilters();
    setSearchTerm("");
  };

  const activeFilterChips = useMemo(
    () =>
      FILTER_GROUPS.flatMap((group) =>
        selected[group.key].map((option) => ({ groupKey: group.key, option }))
      ),
    [selected]
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = term === "" || product.name.toLowerCase().includes(term);

      // Within a group: matches ANY chosen option. Across groups: must match ALL groups.
      const matchesFilters = FILTER_GROUPS.every((group) => {
        const chosen = selected[group.key];
        return chosen.length === 0 || chosen.some((option) => product[group.key].includes(option));
      });

      return matchesSearch && matchesFilters;
    });
  }, [products, searchTerm, selected]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => a.price - b.price);
      case "price-desc":
        return list.sort((a, b) => b.price - a.price);
      default:
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / show));
  const pageProducts = sortedProducts.slice((currentPage - 1) * show, currentPage * show);
  const rangeStart = sortedProducts.length === 0 ? 0 : (currentPage - 1) * show + 1;
  const rangeEnd = Math.min(currentPage * show, sortedProducts.length);

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const catalogIsEmpty = !loading && !loadError && products.length === 0;
  const hasActiveFilters = activeFilterChips.length > 0 || searchTerm.trim() !== "";

  let resultText = "";
  if (!loading && !loadError) {
    resultText =
      sortedProducts.length === 0
        ? catalogIsEmpty
          ? "No products yet"
          : "No matches"
        : `Showing ${rangeStart}–${rangeEnd} of ${sortedProducts.length}`;
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <CatalogHeader />

      <CatalogToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFilterCount={activeFilterChips.length}
        onOpenFilters={() => setFilterOpen(true)}
        resultText={resultText}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        show={show}
        onShowChange={setShow}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <div className="flex gap-10 px-6 py-10 md:px-10 lg:px-24">
        <FilterSidebar
          groups={filterGroups}
          selected={selected}
          onToggle={toggleFilter}
          onClear={clearFilters}
          activeCount={activeFilterChips.length}
          resultCount={sortedProducts.length}
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
        />

        <main className="min-w-0 flex-1">
          <ActiveFilters chips={activeFilterChips} onRemove={removeFilter} onClear={clearFilters} />

          <ProductGrid
            loading={loading}
            loadError={loadError}
            products={pageProducts}
            viewMode={viewMode}
            skeletonCount={Math.min(show, 8)}
            catalogIsEmpty={catalogIsEmpty}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
          />

          {!loading && !loadError && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Catalog;