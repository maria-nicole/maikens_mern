// Customer-facing size guide. The admin console can replace these rows; this
// copy is only the fallback while the settings request is still loading.
export const DEFAULT_SIZE_GUIDE = [
    { size: "S", waistline: 29, bust: 36, hips: 36 },
    { size: "M", waistline: 31, bust: 36, hips: 36 },
    { size: "L", waistline: 33, bust: 38, hips: 38 },
    { size: "XL", waistline: 35, bust: 40, hips: 40 },
    { size: "2XL", waistline: 37, bust: 42, hips: 42 },
    { size: "3XL", waistline: 39, bust: 44, hips: 44 },
];

export const toSizeChart = (rows) =>
    Object.fromEntries(
        (Array.isArray(rows) ? rows : [])
            .filter((row) => row && row.size)
            .map((row) => [row.size, row])
    );

export const measurement = (value) =>
    value === null || value === undefined || value === "" ? "—" : `${value}"`;
