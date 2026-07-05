import { useState } from "react";
import { docToHtml } from "./docToHtml";

const WIDTHS = { desktop: "100%", tablet: "768px", mobile: "375px" };

export default function PreviewPanel({ doc, frontmatter, onClose }: { doc: any; frontmatter: any; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const html = docToHtml(doc, frontmatter);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
      <div className="flex items-center justify-between bg-white px-6 py-3">
        <div className="flex gap-2">
          {(["desktop", "tablet", "mobile"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                device === d ? "bg-royal text-white" : "text-ink/60 hover:bg-sand-light"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="rounded-full px-4 py-1.5 text-sm font-semibold text-ink/60 hover:text-royal">
          Close Preview ✕
        </button>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto py-6">
        <iframe
          title="Preview"
          srcDoc={html}
          style={{ width: WIDTHS[device], height: "100%", minHeight: "80vh" }}
          className="rounded-xl bg-white shadow-2xl transition-all"
        />
      </div>
    </div>
  );
}
