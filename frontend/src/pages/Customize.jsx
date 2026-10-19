import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";

import { API_URL, imageUrl } from "../components/customize/customizeShared";
import { GROUPS, buildRows, prefillFromProduct } from "../components/customize/designOptions";
import { hexForName, normalizeHex } from "../lib/colors";
import CustomizeHeader from "../components/customize/CustomizeHeader";
import StartStep from "../components/customize/StartStep";
import DesignStep from "../components/customize/DesignStep";
import PreviewStep from "../components/customize/PreviewStep";
import { Toast, Lightbox } from "../components/customize/Overlays";
import { ErrorScreen, SentScreen } from "../components/customize/CustomizeScreens";

/**
 * Customize page: the state and the API calls live here.
 * Everything you see lives in src/components/customize/.
 *
 * Steps: 1 Start  ->  2 Design (one section at a time)  ->  3 Preview & send
 */
const STEPS = ["Start", "Design", "Preview & send"];
const DRAFT_KEY = "customizeDraft";
const EDITABLE = ["Pending review", "In discussion"]; // same as the backend
const EMPTY_REF = { file: null, preview: "", url: "" };

export default function Customize() {
  const location = useLocation();
  const [params] = useSearchParams();

  const [step, setStep] = useState(0);
  const [section, setSection] = useState(null); // which section of the Design step is open
  const [category, setCategory] = useState("Gown");
  const [mode, setMode] = useState("scratch"); // "scratch" | "redesign"
  const [baseProduct, setBaseProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [selections, setSelections] = useState({});
  const [notes, setNotes] = useState("");
  const [refs, setRefs] = useState({ content: EMPTY_REF, style: EMPTY_REF });

  const [preview, setPreview] = useState("");
  const [previewKey, setPreviewKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [remaining, setRemaining] = useState(null);
  const [lightbox, setLightbox] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [pageError, setPageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sent, setSent] = useState(null);
  const [toast, setToast] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const groups = GROUPS[category];
  const locked = !!editId && !EDITABLE.includes(editStatus);

  /* ---- load: edit an existing request, start from a product, or restore a draft ---- */
  useEffect(() => {
    let ignore = false;
    const editParam = params.get("edit");
    const productParam = params.get("product");

    const loadProduct = async (id, { prefill }) => {
      const { data } = await axios.get(`${API_URL}/api/products/${id}`);
      if (ignore) return null;
      setCategory(data.category);
      setMode("redesign");
      setBaseProduct(data);
      if (prefill) setSelections(prefillFromProduct(data));
      return data;
    };

    (async () => {
      try {
        if (editParam) {
          if (!localStorage.getItem("token")) {
            setPageError("Log in to edit your design.");
            return;
          }
          const { data: item } = await axios.get(`${API_URL}/api/customizations/${editParam}`, { headers: authHeader() });
          if (ignore) return;
          setEditId(item._id);
          setEditStatus(item.status);
          setCategory(item.category || "Gown");
          setMode(item.mode || "scratch");
          setSelections(Object.fromEntries(Object.entries(item.selections || {}).filter(([, v]) => v)));
          setNotes(item.customerNotes || "");
          setPreview(imageUrl(item.previewImage) ? item.previewImage : "");
          setRefs({
            content: item.references?.content ? { file: null, preview: imageUrl(item.references.content), url: item.references.content } : EMPTY_REF,
            style: item.references?.style ? { file: null, preview: imageUrl(item.references.style), url: item.references.style } : EMPTY_REF,
          });
          if (item.product && item.mode === "redesign") {
            await loadProduct(item.product, { prefill: false }).catch(() => { });
          }
          setStep(1);
        } else if (productParam) {
          await loadProduct(productParam, { prefill: true });
          setStep(1);
        } else {
          const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
          if (draft && !ignore) {
            setCategory(draft.category || "Gown");
            setMode(draft.mode || "scratch");
            setSelections(draft.selections || {});
            setNotes(draft.notes || "");
            if (draft.baseId) await loadProduct(draft.baseId, { prefill: false }).catch(() => { });
          }
        }
      } catch (err) {
        if (!ignore) {
          setPageError(
            err.response?.status === 404
              ? "We couldn't find that design. It may have been removed."
              : err.response?.data?.message || "Couldn't load that design. Please try again."
          );
        }
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a draft so picking options isn't lost if the customer has to log in
  useEffect(() => {
    if (editId || sent) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ category, mode, baseId: baseProduct?._id || null, selections, notes })
      );
    } catch {
      /* ignore */
    }
  }, [category, mode, baseProduct, selections, notes, editId, sent]);

  // Designs available to redesign
  useEffect(() => {
    if (mode !== "redesign") return;
    let ignore = false;
    setProductsLoading(true);
    setProductsError("");
    axios
      .get(`${API_URL}/api/products`, { params: { category } })
      .then((res) => {
        if (!ignore) setProducts((Array.isArray(res.data) ? res.data : []).filter((p) => p.customizable !== false));
      })
      .catch(() => {
        if (!ignore) setProductsError("Couldn't load our designs. Make sure the backend is running, then try again.");
      })
      .finally(() => {
        if (!ignore) setProductsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [mode, category]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---- derived ---- */
  const missing = groups.filter((g) => g.required && !selections[g.key]);
  const startReady = mode === "scratch" || !!baseProduct;
  const styleReady = missing.length === 0;
  const canReach = (i) => i === 0 || (startReady && (i === 1 || styleReady));

  const refCount = [refs.content.preview, refs.style.preview].filter(Boolean).length;
  const extrasText = [refCount && `${refCount} photo${refCount > 1 ? "s" : ""}`, notes.trim() && "Notes added"]
    .filter(Boolean)
    .join(" · ");
  const rows = useMemo(() => buildRows(groups, selections, extrasText), [groups, selections, extrasText]);
  const activeSection = rows.some((r) => r.id === section) ? section : rows[0].id;

  // A preview goes stale as soon as anything that feeds it changes
  const designKey = useMemo(
    () =>
      JSON.stringify({
        category, mode, base: baseProduct?._id || null, selections, notes: notes.trim(),
        c: refs.content.preview, s: refs.style.preview,
      }),
    [category, mode, baseProduct, selections, notes, refs]
  );
  const stale = !!preview && previewKey !== "" && previewKey !== designKey;
  const refsNeedUpload = ["content", "style"].some((r) => refs[r].file && !refs[r].url);
  const canSend = !!token && !locked && !generating && !submitting && !stale && !refsNeedUpload;

  /* ---- handlers ---- */
  // `extra` carries the exact shade when the customer picks a custom color
  const setOption = (key, value, extra) =>
    setSelections((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "color") {
        const hex = normalizeHex(extra?.colorHex) || hexForName(value) || normalizeHex(value);
        if (hex) next.colorHex = hex;
        else delete next.colorHex;
      }
      return next;
    });
  const resetChoices = () => setSelections(baseProduct ? prefillFromProduct(baseProduct) : {});
  const goToSection = (id) => {
    setSection(id);
    setStep(1);
  };

  const chooseCategory = (c) => {
    if (c === category) return;
    setCategory(c);
    setSelections({});
    setBaseProduct(null);
    setSection(null);
  };

  const chooseMode = (m) => {
    setMode(m);
    if (m === "scratch") setBaseProduct(null);
  };

  const chooseProduct = (p) => {
    setBaseProduct(p);
    setSelections(prefillFromProduct(p));
  };

  const pickRef = (role) => (file) => {
    if (file.size > 5 * 1024 * 1024) {
      setToast("That photo is over 5 MB. Please choose a smaller one.");
      return;
    }
    setRefs((prev) => {
      if (prev[role].preview.startsWith("blob:")) URL.revokeObjectURL(prev[role].preview);
      return { ...prev, [role]: { file, preview: URL.createObjectURL(file), url: "" } };
    });
  };

  const clearRef = (role) => () =>
    setRefs((prev) => {
      if (prev[role].preview.startsWith("blob:")) URL.revokeObjectURL(prev[role].preview);
      return { ...prev, [role]: EMPTY_REF };
    });

  async function handleGenerate() {
    setGenError("");
    setGenerating(true);
    try {
      const body = new FormData();
      body.append("category", category);
      body.append("mode", mode);
      if (mode === "redesign" && baseProduct) body.append("productId", baseProduct._id);
      body.append("selections", JSON.stringify(selections));
      body.append("notes", notes.trim());
      ["content", "style"].forEach((role) => {
        if (refs[role].file) body.append(role, refs[role].file);
        else if (refs[role].url) body.append(`${role}Url`, refs[role].url);
      });

      const { data } = await axios.post(`${API_URL}/api/generate-gown`, body, {
        headers: authHeader(),
        timeout: 120000,
      });
      setPreview(data.imageUrl);
      setPreviewKey(designKey);
      setRemaining(typeof data.remaining === "number" ? data.remaining : null);
      // Photos are now saved on the server, so later previews and the final request reuse them
      setRefs((prev) => ({
        content: data.references?.content ? { ...prev.content, file: null, url: data.references.content } : prev.content,
        style: data.references?.style ? { ...prev.style, file: null, url: data.references.style } : prev.style,
      }));
    } catch (err) {
      setGenError(
        err.code === "ECONNABORTED"
          ? "That took too long. Please try again."
          : err.response?.data?.message || "Couldn't generate a preview. Make sure the backend is running."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    setSubmitError("");
    setSubmitting(true);
    try {
      const payload = {
        category,
        mode,
        productId: mode === "redesign" ? baseProduct?._id : undefined,
        selections,
        notes: notes.trim(),
        previewImage: preview,
        references: { content: refs.content.url, style: refs.style.url },
      };
      const url = `${API_URL}/api/customizations${editId ? `/${editId}` : ""}`;
      const { data } = await axios({ method: editId ? "put" : "post", url, data: payload, headers: authHeader() });
      sessionStorage.removeItem(DRAFT_KEY);
      setSent({ ...data, edited: !!editId });

      // Drop the new design into the chat too, so it shows up in Messages
      // (and in the boutique's inbox) without the customer having to attach it.
      if (!editId && data._id) {
        const form = new FormData();
        form.append("share", JSON.stringify({ kind: "customization", refId: data._id }));
        axios.post(`${API_URL}/api/messages`, form, { headers: authHeader() }).catch(() => {
          /* the design is already saved — a chat hiccup shouldn't matter */
        });
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Couldn't send your design. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    sessionStorage.removeItem(DRAFT_KEY);
    window.location.href = "/customize";
  }

  /* ---- page-level screens ---- */
  if (pageError) {
    return <ErrorScreen message={pageError} loggedIn={!!token} location={location} onRestart={startOver} />;
  }
  if (sent) return <SentScreen sent={sent} onRestart={startOver} />;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Toast message={toast} />
      {lightbox && preview && <Lightbox src={imageUrl(preview)} onClose={() => setLightbox(false)} />}

      <CustomizeHeader editing={!!editId} steps={STEPS} current={step} canReach={canReach} onGo={setStep} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {locked && (
          <p className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            This design is already approved, so it can't be edited. Message the boutique if you need a change.
          </p>
        )}

        {step === 0 && (
          <StartStep
            category={category}
            mode={mode}
            baseProduct={baseProduct}
            products={products}
            productsLoading={productsLoading}
            productsError={productsError}
            locked={locked}
            onCategory={chooseCategory}
            onMode={chooseMode}
            onProduct={chooseProduct}
            onNext={() => setStep(1)}
            nextDisabled={!startReady}
          />
        )}

        {step === 1 && (
          <DesignStep
            groups={groups}
            rows={rows}
            activeId={activeSection}
            onSection={setSection}
            selections={selections}
            onSelect={setOption}
            refs={refs}
            notes={notes}
            onNotes={setNotes}
            onPickRef={pickRef}
            onClearRef={clearRef}
            locked={locked}
            baseProduct={baseProduct}
            missing={missing}
            canReset={Object.values(selections).some(Boolean)}
            onReset={resetChoices}
            onBack={() => setStep(0)}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <PreviewStep
            loggedIn={!!token}
            locked={locked}
            editing={!!editId}
            category={category}
            mode={mode}
            baseProduct={baseProduct}
            rows={rows}
            onEdit={goToSection}
            preview={preview}
            stale={stale}
            generating={generating}
            submitting={submitting}
            canSend={canSend}
            refsNeedUpload={refsNeedUpload}
            remaining={remaining}
            genError={genError}
            submitError={submitError}
            onGenerate={handleGenerate}
            onSend={handleSend}
            onZoom={() => setLightbox(true)}
            onBack={() => setStep(1)}
          />
        )}
      </main>
    </div>
  );
}