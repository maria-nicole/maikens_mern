import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  Heart,
  Share2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Sparkles,
  ShoppingBag,
  Ruler,
  X,
  Loader2,
  Palette,
  Check,
  RefreshCw,
} from "lucide-react";
import { BsFacebook } from "react-icons/bs";
import { announceCart } from "../components/account/accountShared";

// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Measurements in inches. Swap for real fitting data once available.
const SIZE_CHART = {
  XS: { bust: 32, waist: 25, hip: 35, length: 56 },
  S: { bust: 34, waist: 27, hip: 37, length: 57 },
  M: { bust: 36, waist: 29, hip: 39, length: 58 },
  L: { bust: 38, waist: 31, hip: 41, length: 59 },
  XL: { bust: 40, waist: 33, hip: 43, length: 60 },
  XXL: { bust: 42, waist: 35, hip: 45, length: 61 },
};

const MAX_MADE_TO_ORDER_QTY = 10;

const formatPrice = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value || 0);

const imageUrl = (path) => (!path ? null : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);

const chipClass = (active, disabled) =>
  `px-3 py-1.5 rounded-full text-sm border transition-colors ${disabled
    ? "bg-gray-50 text-gray-300 border-gray-100 line-through cursor-not-allowed"
    : active
      ? "bg-yellow-600/89 text-white border-yellow-600/89"
      : "bg-white text-gray-600 border-gray-200 hover:border-yellow-200/89 hover:text-yellow-600/89"
  }`;

const primaryBtn =
  "text-white bg-yellow-600/89 border border-yellow-600/89 rounded-md font-medium hover:bg-white hover:text-yellow-600/89 duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white";

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  // Data from the database
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(""); // "" | "notfound" | "failed"
  const [related, setRelated] = useState([]);

  // Gallery + purchase
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState("");
  const [wishlisted, setWishlisted] = useState(false);

  // Size guide
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Cart request in flight
  const [adding, setAdding] = useState(false);

  // Virtual try-on
  const [tryOnFile, setTryOnFile] = useState(null);
  const [tryOnPhoto, setTryOnPhoto] = useState(null); // the customer's photo (preview)
  const [tryOnResult, setTryOnResult] = useState(""); // AI result (data URL)
  const [tryOnStatus, setTryOnStatus] = useState("idle"); // idle | processing | done | error
  const [tryOnError, setTryOnError] = useState("");
  const [tryOnRemaining, setTryOnRemaining] = useState(null);

  // Load the product whenever the URL id changes
  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setLoadError("");
    setProduct(null);
    setImgIdx(0);
    setSelectedSize(null);
    setSizeError(false);
    setQuantity(1);
    setTryOnFile(null);
    setTryOnPhoto(null);
    setTryOnResult("");
    setTryOnError("");
    setTryOnStatus("idle");
    window.scrollTo(0, 0);

    axios
      .get(`${API_URL}/api/products/${id}`)
      .then((res) => {
        if (!ignore) setProduct(res.data);
      })
      .catch((err) => {
        if (ignore) return;
        console.error(err);
        setLoadError(err.response?.status === 404 ? "notfound" : "failed");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  // "You may also like": same category, from the public catalog route
  useEffect(() => {
    if (!product?.category) return;
    let ignore = false;
    axios
      .get(`${API_URL}/api/products`, { params: { category: product.category } })
      .then((res) => {
        if (ignore || !Array.isArray(res.data)) return;
        setRelated(res.data.filter((p) => p._id !== product._id).slice(0, 4));
      })
      .catch(() => { });
    return () => {
      ignore = true;
    };
  }, [product?._id, product?.category]);

  // Show a filled heart if this product is already one of the customer's favorites
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!product || !token) {
      setWishlisted(false);
      return;
    }
    let ignore = false;
    axios
      .get(`${API_URL}/api/favorites/ids`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!ignore) setWishlisted(Array.isArray(res.data) && res.data.includes(product._id));
      })
      .catch(() => { });
    return () => {
      ignore = true;
    };
  }, [product]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  /* ------------------------------ Loading / error states ------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20">
        <div className="px-6 md:px-10 lg:px-24 py-10 grid lg:grid-cols-2 gap-10">
          <div className="aspect-[3/4] bg-zinc-100 animate-pulse rounded-lg" />
          <div className="space-y-4">
            <div className="h-4 w-32 bg-zinc-100 animate-pulse rounded" />
            <div className="h-10 w-3/4 bg-zinc-100 animate-pulse rounded" />
            <div className="h-8 w-40 bg-zinc-100 animate-pulse rounded" />
            <div className="h-24 w-full bg-zinc-100 animate-pulse rounded" />
            <div className="h-12 w-full bg-zinc-100 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !product) {
    const notFound = loadError === "notfound";
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center w-full max-w-md">
          <h1 className="text-2xl font-bold text-neutral-800">
            {notFound ? "This item isn't available" : "Couldn't load this item"}
          </h1>
          <p className="text-sm text-zinc-600 mt-2 mb-6">
            {notFound
              ? "It may have been removed or is no longer listed. Browse the catalog for similar gowns and barong."
              : "Make sure the backend is running, then try again."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!notFound && (
              <button onClick={() => window.location.reload()} className={`px-6 py-2.5 text-sm ${primaryBtn}`}>
                Try again
              </button>
            )}
            <Link
              to="/catalog"
              className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Back to catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ Derived values ------------------------------ */
  const images = (product.images || []).map(imageUrl);
  const sizes = product.sizes || [];
  const needsSize = sizes.length > 0;
  const madeToOrder = product.fulfillment === "Made-to-order";
  const soldOut = !madeToOrder && needsSize && product.totalStock === 0;

  const stockFor = (size) => sizes.find((s) => s.size === size)?.stock ?? 0;
  const maxQty = madeToOrder
    ? MAX_MADE_TO_ORDER_QTY
    : needsSize
      ? Math.max(1, stockFor(selectedSize) || product.totalStock || 1)
      : MAX_MADE_TO_ORDER_QTY;

  const availability = madeToOrder
    ? { label: "Made to order", color: "text-blue-700 bg-blue-50 border-blue-200" }
    : soldOut
      ? { label: "Out of stock", color: "text-red-700 bg-red-50 border-red-200" }
      : product.status === "Low stock"
        ? { label: `Only ${product.totalStock} left`, color: "text-amber-700 bg-amber-50 border-amber-200" }
        : { label: "In stock", color: "text-green-700 bg-green-50 border-green-200" };

  const sizeGuideRows = (needsSize ? sizes.map((s) => s.size) : Object.keys(SIZE_CHART)).filter((s) => SIZE_CHART[s]);

  const details = [
    ["Category", product.category],
    ["Material", product.material],
    ["Color", (product.colors || []).map((c) => c.name).join(", ")],
    ["Sleeve", product.sleeve],
    ["Length", product.length],
    ["Event type", (product.eventTypes || []).join(", ")],
    ["Sold as", product.fulfillment],
  ].filter(([, value]) => value);

  /* ------------------------------ Handlers ------------------------------ */
  const goToLogin = () => navigate("/login", { state: { from: location } });

  async function handleAddToCart() {
    if (soldOut || adding) return;
    if (needsSize && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);

    const token = localStorage.getItem("token");
    if (!token) return goToLogin();

    setAdding(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/cart`,
        { productId: product._id, size: selectedSize || "", quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      announceCart(data); // keeps the navbar's cart badge in step
      setToast(`Added ${quantity} × ${product.name}${selectedSize ? ` (${selectedSize})` : ""} to your cart`);
    } catch (err) {
      if (err.response?.status === 401) return goToLogin();
      setToast(err.response?.data?.message || "Couldn't add to your cart. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleWishlist() {
    const token = localStorage.getItem("token");
    if (!token) return goToLogin();

    const next = !wishlisted;
    setWishlisted(next); // update the heart right away, undo if the request fails
    try {
      await axios({
        method: next ? "post" : "delete",
        url: `${API_URL}/api/favorites/${product._id}`,
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast(next ? "Saved to your favorites" : "Removed from your favorites");
    } catch (err) {
      setWishlisted(!next);
      if (err.response?.status === 401) return goToLogin();
      setToast(err.response?.data?.message || "Couldn't update your favorites.");
    }
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
      }
    } catch {
      /* cancelled or blocked: nothing to do */
    }
  }

//TRY ON
  async function runTryOn(file) {
    const token = localStorage.getItem("token");
    if (!token) return goToLogin();

    setTryOnError("");
    setTryOnStatus("processing");
    try {
      const body = new FormData();
      body.append("photo", file);
      body.append("productId", product._id);
      body.append("imageIndex", String(imgIdx)); // uses the product photo currently shown

      const { data } = await axios.post(`${API_URL}/api/try-on`, body, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120000,
      });
      setTryOnResult(data.imageData);
      setTryOnRemaining(typeof data.remaining === "number" ? data.remaining : null);
      setTryOnStatus("done");
    } catch (err) {
      if (err.response?.status === 401) return goToLogin();
      setTryOnError(
        err.code === "ECONNABORTED"
          ? "That took too long. Please try again."
          : err.response?.data?.message || "Couldn't create your preview. Please try again."
      );
      setTryOnStatus("error");
    }
  }

  function handleUploadClick() {
    if (!localStorage.getItem("token")) return goToLogin(); // log in first so the photo isn't lost
    fileInputRef.current?.click();
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setToast("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast("That photo is over 5 MB. Please choose a smaller one.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setTryOnFile(file);
      setTryOnPhoto(reader.result);
      setTryOnResult("");
      runTryOn(file);
    };
    reader.readAsDataURL(file);
  }

  function resetTryOn() {
    setTryOnFile(null);
    setTryOnPhoto(null);
    setTryOnResult("");
    setTryOnError("");
    setTryOnStatus("idle");
  }

  /* ------------------------------ Render ------------------------------ */
  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 text-white px-5 py-3 rounded-md shadow-lg text-sm flex items-center gap-2"
        >
          <Check size={14} className="text-yellow-500" />
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="px-6 md:px-10 lg:px-24 pt-4">
        <nav aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li>
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-yellow-700/89 duration-100">
                Home
              </Link>
            </li>
            <li className="flex items-center space-x-1.5">
              <ChevronRight size={14} className="text-gray-400" />
              <Link to="/catalog" className="text-sm font-medium text-gray-600 hover:text-yellow-700/89 duration-100">
                Catalog
              </Link>
            </li>
            <li aria-current="page" className="flex items-center space-x-1.5">
              <ChevronRight size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-400">{product.name}</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Main layout */}
      <div className="px-6 md:px-10 lg:px-24 py-8 grid lg:grid-cols-2 gap-10 items-start">
        {/* LEFT: gallery + try-on */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[3/4] bg-zinc-100 overflow-hidden rounded-lg border border-gray-200">
            {images.length > 0 ? (
              <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">No photo</div>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 hover:bg-white transition shadow-sm"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={16} className="text-neutral-800" />
                </button>
                <button
                  onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 hover:bg-white transition shadow-sm"
                  aria-label="Next image"
                >
                  <ChevronRight size={16} className="text-neutral-800" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setImgIdx(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className={`w-20 h-24 rounded-md overflow-hidden border-2 transition-colors ${imgIdx === i ? "border-yellow-600/89" : "border-transparent hover:border-gray-300"
                    }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Virtual try-on */}
          {/* Virtual try-on */}
          <div className="rounded-lg bg-orange-100/89 p-5 mt-2">
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/60 text-yellow-700/89 text-xs font-semibold uppercase tracking-wide">
              <Sparkles size={13} />
              AI-Powered
            </div>
            <p className="text-lg font-bold text-neutral-800">Visualize before you wear it</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {tryOnStatus === "idle" && (
              <>
                <p className="text-sm text-zinc-600 mt-1 mb-4">
                  Upload a full-body photo and see how this {product.category.toLowerCase()} looks on you.
                </p>
                <button
                  onClick={handleUploadClick}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 text-sm ${primaryBtn}`}
                >
                  <Upload size={14} />
                  Upload photo &amp; try on
                </button>
                <p className="text-xs text-zinc-500 mt-3">
                  Best results: stand straight, face the camera, good lighting. Your photo is only used to create the preview
                  and is not saved.
                </p>
              </>
            )}

            {tryOnStatus === "processing" && (
              <div className="flex flex-col items-center gap-3 py-5">
                <img
                  src={tryOnPhoto}
                  alt="Your upload"
                  className="w-20 h-20 rounded-full object-cover border-2 border-yellow-600/89"
                />
                <div className="flex items-center gap-2 text-sm text-neutral-800 font-medium">
                  <Loader2 size={15} className="animate-spin text-yellow-600/89" />
                  Generating your preview…
                </div>
                <p className="text-xs text-zinc-500">This can take up to a minute.</p>
              </div>
            )}

            {tryOnStatus === "done" && (
              <div className="flex flex-col gap-3 mt-3">
                <img
                  src={tryOnResult}
                  alt={`You wearing ${product.name}`}
                  className="w-full aspect-[3/4] rounded-md object-cover border border-white bg-white"
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-green-700">
                  <Check size={13} /> Preview ready
                  {tryOnRemaining !== null && (
                    <span className="ml-auto font-normal text-zinc-500">
                      {tryOnRemaining} left this hour
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  This is an AI preview. Actual fit and fabric may look slightly different in person.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => tryOnFile && runTryOn(tryOnFile)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md border border-yellow-700/89 text-yellow-700/89 text-xs font-semibold hover:bg-white/60 transition-colors"
                  >
                    <RefreshCw size={12} />
                    Generate again
                  </button>
                  <button
                    onClick={resetTryOn}
                    className="flex-1 py-2 rounded-md border border-yellow-700/89 text-yellow-700/89 text-xs font-semibold hover:bg-white/60 transition-colors"
                  >
                    Different photo
                  </button>
                </div>
              </div>
            )}

            {tryOnStatus === "error" && (
              <div className="flex flex-col gap-3 mt-3">
                <p role="alert" className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {tryOnError}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => tryOnFile && runTryOn(tryOnFile)}
                    className={`flex-1 py-2 text-xs ${primaryBtn}`}
                  >
                    Try again
                  </button>
                  <button
                    onClick={resetTryOn}
                    className="flex-1 py-2 rounded-md border border-yellow-700/89 text-yellow-700/89 text-xs font-semibold hover:bg-white/60 transition-colors"
                  >
                    Different photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: details */}
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-yellow-700/89 uppercase tracking-wide mb-1">
                {product.category}
                {product.eventTypes?.[0] ? ` · ${product.eventTypes[0]}` : ""}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-800 md:text-4xl">{product.name}</h1>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={toggleWishlist}
                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-label={wishlisted ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={wishlisted}
              >
                <Heart size={16} className={wishlisted ? "fill-yellow-600/89 text-yellow-600/89" : "text-gray-400"} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-label="Share"
              >
                <Share2 size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-neutral-800">{formatPrice(product.price)}</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${availability.color}`}>
              {availability.label}
            </span>
          </div>

          {product.colors?.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {product.colors.map((c) => (
                  <span
                    key={c.hex}
                    title={c.name}
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {product.description && <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>}

          {/* Customize CTA */}
          {product.customizable && (
            <button
              onClick={() => navigate(`/customize?product=${product._id}`)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-yellow-600/89 transition-colors text-left"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-neutral-800">
                <span className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <Palette size={15} className="text-yellow-600/89" />
                </span>
                Customize this design
              </span>
              <ChevronRight size={15} className="text-gray-400" />
            </button>
          )}

          {/* Size selector */}
          {needsSize && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Select size</p>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="flex items-center gap-1 text-xs text-yellow-700/89 font-medium hover:underline"
                >
                  <Ruler size={12} /> Size guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map(({ size, stock }) => {
                  const unavailable = !madeToOrder && stock === 0;
                  return (
                    <button
                      key={size}
                      disabled={unavailable}
                      onClick={() => {
                        setSelectedSize(size);
                        setSizeError(false);
                        setQuantity(1);
                      }}
                      aria-pressed={selectedSize === size}
                      className={chipClass(selectedSize === size, unavailable)}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {sizeError && (
                <p role="alert" className="text-xs text-red-700 mt-2">
                  Please select a size before adding to cart.
                </p>
              )}
              {madeToOrder && (
                <p className="text-xs text-gray-400 mt-2">
                  Made to order: the boutique will confirm your exact measurements at your fitting.
                </p>
              )}
            </div>
          )}

          {/* Quantity + add to cart */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-md">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-l-md"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="px-4 text-sm font-medium text-neutral-800">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
                className="px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-r-md disabled:opacity-40"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={soldOut || adding}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-base ${primaryBtn}`}
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
              {soldOut ? "Out of stock" : adding ? "Adding…" : "Add to cart"}
            </button>
          </div>

          {/* Details */}
          {details.length > 0 && (
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-gray-700 text-right">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="px-6 md:px-10 lg:px-24 pb-16">
          <h2 className="text-2xl font-bold text-neutral-800 mb-5">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => (
              <div key={p._id} className="bg-zinc-100">
                {p.images?.[0] ? (
                  <img className="h-70 w-full object-cover" src={imageUrl(p.images[0])} alt={p.name} />
                ) : (
                  <div className="h-70 w-full flex items-center justify-center bg-zinc-200 text-xs text-zinc-400">
                    No photo
                  </div>
                )}
                <div className="p-3">
                  <h3 className="text-xl font-bold pb-1 text-neutral-800">{p.name}</h3>
                  <p className="text-zinc-800 font-semibold pb-2">{formatPrice(p.price)}</p>
                  <Link
                    to={`/product/${p._id}`}
                    className="font-bold mb-3 text-neutral-800 hover:text-yellow-700/89 duration-200 cursor-pointer inline-block"
                  >
                    VIEW
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Size guide modal */}
      {showSizeGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowSizeGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Size guide"
            className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-800">Size guide (inches)</h2>
              <button onClick={() => setShowSizeGuide(false)} aria-label="Close">
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-2">Size</th>
                  <th className="py-2">Bust / chest</th>
                  <th className="py-2">Waist</th>
                  <th className="py-2">Hip</th>
                  <th className="py-2">Length</th>
                </tr>
              </thead>
              <tbody>
                {sizeGuideRows.map((s) => (
                  <tr key={s} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-yellow-700/89">{s}</td>
                    <td className="py-2 text-gray-700">{SIZE_CHART[s].bust}&quot;</td>
                    <td className="py-2 text-gray-700">{SIZE_CHART[s].waist}&quot;</td>
                    <td className="py-2 text-gray-700">{SIZE_CHART[s].hip}&quot;</td>
                    <td className="py-2 text-gray-700">{SIZE_CHART[s].length}&quot;</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-4">
              Measurements are a general guide. For a made-to-order fit, our staff will confirm exact measurements
              during your in-store fitting.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-200 px-6 py-10 mt-10">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <div className="my-5 lg:mx-5 gap-2 mb-6 sm:mb-0">
              <span className="text-2xl font-bold text-gray-800">MAIKENS</span>
              <p className="py-5 text-gray-400">
                Stall A18 Disenyo Pandi
                <br />
                Wedding Depot
                <br />
                Grace Park Street, Bagong Barrio, Pandi, 3014 Bulacan
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:mt-4 sm:grid-cols-3 sm:gap-6">
              <div>
                <h2 className="mb-6 text-sm font-semibold uppercase text-gray-900">Link</h2>
                <ul className="flex flex-col gap-5">
                  <li><Link to="/" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">Home</Link></li>
                  <li><Link to="/catalog" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">Shop</Link></li>
                  <li><Link to="/about" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">About</Link></li>
                  <li><Link to="/contact" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">Contact</Link></li>
                </ul>
              </div>

              <div>
                <h2 className="mb-6 text-sm font-semibold uppercase text-gray-900">Help</h2>
                <ul className="flex flex-col gap-5">
                  <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">Payment Options</a></li>
                  <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">Returns</a></li>
                  <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">Privacy Policies</a></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="my-6 border-gray-200" />

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <span className="text-sm text-gray-500">
              © 2026 <a href="#" className="hover:underline">MAIKENS GOWN &amp; BARONG</a>. All Rights Reserved.
            </span>
            <div className="flex gap-6">
              <a href="#" aria-label="Facebook" className="text-gray-500 hover:text-gray-900 transition-colors">
                <BsFacebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}