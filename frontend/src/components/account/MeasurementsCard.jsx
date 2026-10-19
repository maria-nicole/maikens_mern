import { Ruler } from "lucide-react";
import { SectionCard } from "./atoms";

/* Read-only measurements the boutique records during a fitting. */
export default function MeasurementsCard({ measurements }) {
  return (
    <SectionCard title="Saved Measurements" icon={Ruler}>
      {measurements ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(measurements).map(([label, value]) => (
              <div key={label} className="bg-rose-50 rounded-md p-2.5 text-center">
                <p className="text-xs text-gray-400 capitalize">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Used to speed up fitting and custom design requests.</p>
        </>
      ) : (
        <p className="text-sm text-gray-400">
          No measurements saved yet. The boutique will record them during your fitting.
        </p>
      )}
    </SectionCard>
  );
}
