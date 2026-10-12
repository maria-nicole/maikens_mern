import { Link } from "react-router-dom";
import { Check, Shirt, Wand2 } from "lucide-react";
import { formatPrice, imageUrl } from "./customizeShared";
import StepFooter from "./StepFooter";

function ChoiceCard({ icon: Icon, title, text, active, disabled, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? "border-yellow-600/89 ring-1 ring-yellow-600/89 bg-rose-50" : "border-gray-200 hover:border-yellow-200/89"
                }`}
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
                <Icon size={18} className="text-yellow-600/89" />
            </span>
            <span>
                <span className="block text-sm font-semibold text-neutral-800">{title}</span>
                <span className="block text-xs text-gray-400">{text}</span>
            </span>
        </button>
    );
}

function ProductCard({ product, selected, disabled, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={selected}
            className={`relative overflow-hidden rounded-lg border text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-yellow-600/89 ring-2 ring-yellow-600/89" : "border-gray-200 hover:border-yellow-200/89"
                }`}
        >
            {product.images?.[0] ? (
                <img src={imageUrl(product.images[0])} alt={product.name} className="aspect-[3/4] w-full bg-zinc-100 object-cover" />
            ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center bg-zinc-100 text-xs text-zinc-400">No photo</div>
            )}
            {selected && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-600/89 text-white">
                    <Check size={14} />
                </span>
            )}
            <div className="p-2.5">
                <p className="truncate text-sm font-semibold text-neutral-800">{product.name}</p>
                <p className="text-xs text-gray-400">{formatPrice(product.price)}</p>
            </div>
        </button>
    );
}

export default function StartStep({
    category, mode, baseProduct, products, productsLoading, productsError, locked,
    onCategory, onMode, onProduct, onNext, nextDisabled,
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-8">
            <div className="space-y-10">
                <section>
                    <h2 className="text-xl font-bold text-neutral-800">What are you designing?</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <ChoiceCard
                            icon={Shirt}
                            title="Gown"
                            text="Wedding, debut, ninang and formal gowns"
                            active={category === "Gown"}
                            disabled={locked}
                            onClick={() => onCategory("Gown")}
                        />
                        <ChoiceCard
                            icon={Shirt}
                            title="Barong"
                            text="Barong Tagalog for formal occasions"
                            active={category === "Barong"}
                            disabled={locked}
                            onClick={() => onCategory("Barong")}
                        />
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-neutral-800">How do you want to start?</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <ChoiceCard
                            icon={Shirt}
                            title="Redesign one of our designs"
                            text="Start from a design in our catalog and change what you like."
                            active={mode === "redesign"}
                            disabled={locked}
                            onClick={() => onMode("redesign")}
                        />
                        <ChoiceCard
                            icon={Wand2}
                            title="Start from scratch"
                            text="Build a new design from our colors, shapes and fabrics."
                            active={mode === "scratch"}
                            disabled={locked}
                            onClick={() => onMode("scratch")}
                        />
                    </div>
                </section>

                {mode === "redesign" && (
                    <section>
                        <h2 className="mb-3 text-base font-semibold text-neutral-800">Pick a design to start from</h2>
                        {productsError && (
                            <p role="alert" className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {productsError}
                            </p>
                        )}
                        {productsLoading ? (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-zinc-100" />
                                ))}
                            </div>
                        ) : !productsError && products.length === 0 ? (
                            <p className="text-sm text-gray-400">
                                No designs are available to redesign yet. You can start from scratch instead.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {products.map((p) => (
                                    <ProductCard
                                        key={p._id}
                                        product={p}
                                        selected={baseProduct?._id === p._id}
                                        disabled={locked}
                                        onClick={() => onProduct(p)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>

            <StepFooter
                onNext={onNext}
                nextLabel="Start designing"
                nextDisabled={nextDisabled}
                hint={nextDisabled ? "Pick a design to redesign, or choose Start from scratch." : null}
            />

            <p className="mt-4 text-center text-xs text-gray-400">
                Prefer something ready-made?{" "}
                <Link to="/catalog" className="font-medium text-yellow-700/89 hover:underline">
                    Browse the catalog
                </Link>
            </p>
        </div>
    );
}