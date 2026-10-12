// Returns e.g. [1, "…", 4, 5, 6, "…", 12]
function getPageList(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const out = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
        out.push(p);
    });
    return out;
}

const baseBtn =
    "flex h-9 items-center justify-center rounded-md text-sm font-medium duration-100 bg-orange-100/89 hover:bg-yellow-700/89 hover:text-white";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    return (
        <nav aria-label="Pagination" className="mt-12 flex justify-center">
            <ul className="flex flex-wrap items-center justify-center gap-2">
                <li>
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`${baseBtn} px-3 disabled:opacity-40 disabled:hover:bg-orange-100/89 disabled:hover:text-inherit`}
                    >
                        Previous
                    </button>
                </li>

                {getPageList(currentPage, totalPages).map((page, i) =>
                    page === "…" ? (
                        <li key={`gap-${i}`} className="px-1 text-stone-400" aria-hidden="true">
                            …
                        </li>
                    ) : (
                        <li key={page}>
                            <button
                                onClick={() => onPageChange(page)}
                                aria-current={page === currentPage ? "page" : undefined}
                                className={`${baseBtn} w-9 ${page === currentPage ? "!bg-yellow-700/89 text-white" : ""}`}
                            >
                                {page}
                            </button>
                        </li>
                    )
                )}

                <li>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`${baseBtn} px-3 disabled:opacity-40 disabled:hover:bg-orange-100/89 disabled:hover:text-inherit`}
                    >
                        Next
                    </button>
                </li>
            </ul>
        </nav>
    );
}