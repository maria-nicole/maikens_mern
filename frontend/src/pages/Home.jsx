import { useEffect, useState } from "react";
import axios from "axios";

import HeroCarousel from "../components/home/HeroCarousel";
import FeatureHighlights from "../components/home/FeatureHighlights";
import FeaturedCollection from "../components/home/FeaturedCollection";
import CatalogPreview from "../components/home/CatalogPreview";
import TryOnBanner from "../components/home/TryOnBanner";
import FacebookGallery from "../components/home/FacebookGallery";
import Footer from "../components/Footer";
import { API_URL, normalizeProduct } from "../components/catalog/catalogConfig";

const FEATURED_COUNT = 3; // the newest products with a photo
const INITIAL_VISIBLE = 4;
const SHOW_MORE_STEP = 4;

const Homepage = () => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  // Products from the database (GET /api/products). The server hides drafts and
  // archived items and returns the newest first.
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;
    axios
      .get(`${API_URL}/api/products`)
      .then((res) => {
        if (!Array.isArray(res.data)) throw new Error("Unexpected response from the server");
        if (!ignore) setProducts(res.data.map(normalizeProduct));
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) setLoadError("Couldn't load our collection right now. Please refresh in a moment.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Featured = the newest products that have a photo.
  // Catalog preview = everything else, so the same item isn't shown twice
  // (if fewer than a full row would be left, it shows all products instead).
  const featured = products.filter((p) => p.image).slice(0, FEATURED_COUNT);
  const featuredIds = new Set(featured.map((p) => p.id));
  const rest = products.filter((p) => !featuredIds.has(p.id));
  const catalogList = rest.length >= INITIAL_VISIBLE ? rest : products;

  const visibleProducts = catalogList.slice(0, visibleCount);
  const hasMore = visibleCount < catalogList.length;

  return (
    <div>
      <HeroCarousel />
      <FeatureHighlights />
      <FeaturedCollection loading={loading} items={featured} count={FEATURED_COUNT} />
      <CatalogPreview
        loading={loading}
        loadError={loadError}
        products={visibleProducts}
        skeletonCount={INITIAL_VISIBLE}
        hasMore={hasMore}
        onShowMore={() => setVisibleCount((n) => Math.min(n + SHOW_MORE_STEP, catalogList.length))}
      />
      <TryOnBanner />
      <FacebookGallery />
      <Footer />
    </div>
  );
};

export default Homepage;