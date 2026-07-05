import { useMemo } from "react";
import { analyzeSeo } from "./seoAnalysis";

const statusColor = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

export default function SeoPanel({
  frontmatter,
  doc,
  focusKeyword,
  onFocusKeywordChange,
}: {
  frontmatter: any;
  doc: any;
  focusKeyword: string;
  onFocusKeywordChange: (v: string) => void;
}) {
  const { score, checks } = useMemo(() => analyzeSeo(frontmatter, doc, focusKeyword), [frontmatter, doc, focusKeyword]);

  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="rounded-xl border border-sand-light bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">SEO Score</h3>
        <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
      </div>

      <label className="mb-1 block text-xs text-ink/60">Focus keyword</label>
      <input
        value={focusKeyword}
        onChange={(e) => onFocusKeywordChange(e.target.value)}
        placeholder="e.g. Sahara desert tour"
        className="mb-3 w-full rounded border border-sand-light px-2 py-1.5 text-sm"
      />

      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.id} className="flex gap-2 text-xs">
            <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusColor[c.status]}`} />
            <div>
              <span className="font-medium text-ink">{c.label}</span>
              <p className="text-ink/60">{c.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
