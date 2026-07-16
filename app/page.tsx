"use client";

import { useState } from "react";

type Review = {
  summary: string;
  strengths: string[];
  gaps: string[];
  missingKeywords: string[];
  suggestions: string[];
  overallScore: number;
};

type Meta = {
  model: string;
  tokensUsed: number;
  responseId: string;
};

const ROLES = [
  "Backend Engineer",
  "Frontend Engineer",
  "Full Stack Engineer",
  "AI Engineer",
] as const;

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-yellow-400";
  return "text-red-400";
};

const SCORE_RING = (score: number) => {
  if (score >= 8) return "stroke-emerald-400";
  if (score >= 6) return "stroke-yellow-400";
  return "stroke-red-400";
};

function ScoreDial({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className={SCORE_RING(score)}
          strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          className={`text-2xl font-bold ${SCORE_COLOR(score)}`}
          fill="currentColor"
          fontSize="22"
          fontWeight="bold"
        >
          {score}/10
        </text>
      </svg>
      <span className="text-xs text-slate-400 uppercase tracking-widest">
        Overall Score
      </span>
    </div>
  );
}

function Tag({ text, variant }: { text: string; variant: "green" | "red" | "yellow" | "blue" }) {
  const cls = {
    green: "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40",
    red: "bg-red-900/40 text-red-300 border border-red-700/40",
    yellow: "bg-yellow-900/40 text-yellow-300 border border-yellow-700/40",
    blue: "bg-blue-900/40 text-blue-300 border border-blue-700/40",
  }[variant];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {text}
    </span>
  );
}

function Section({
  title,
  icon,
  items,
  variant,
}: {
  title: string;
  icon: string;
  items: string[];
  variant: "green" | "red" | "yellow" | "blue";
}) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
            <span className="mt-0.5 shrink-0">
              {variant === "green" ? "✓" : variant === "red" ? "✗" : "→"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const [resume, setResume] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  // Bug 4 fixed: initialize to first valid role, not empty string
  const [role, setRole] = useState<string>(ROLES[0]);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // Bug 1 fixed: prevent browser from reloading the page on form submit
    e.preventDefault();
    setError(null);
    setReview(null);
    setMeta(null);

    try {
      setLoading(true);
      const response = await fetch("/api/review-resume", {
        method: "POST",
        body: JSON.stringify({ resume, yearsOfExperience, role }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      // Bug 2 fixed: check response.ok before trusting the shape of data
      if (!response.ok) {
        setError(data.details ?? data.error ?? "Something went wrong.");
        return;
      }

      setReview(data.review);
      setMeta(data.meta);
    } catch (err) {
      // Bug 3 fixed: display the error; Bug 5 fixed: cast unknown error correctly
      setError((err as Error).message ?? "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const charCount = resume.length;
  const charValid = charCount >= 200 && charCount <= 15000;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-900/40 border border-indigo-700/40 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-4">
            AI-Powered
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Resume Reviewer
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Paste your resume and get brutally honest, ATS-calibrated feedback powered by Gemini.
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-xl"
        >
          {/* Resume textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-slate-300">
                Resume Text
              </label>
              <span className={`text-xs ${charValid ? "text-emerald-400" : "text-slate-500"}`}>
                {charCount.toLocaleString()} / 15,000 chars
                {charCount > 0 && charCount < 200 && (
                  <span className="text-red-400 ml-2">(min 200)</span>
                )}
              </span>
            </div>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your full resume text here…"
              rows={10}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-600 text-sm px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Role + Experience row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Target Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Years of Experience
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-xl bg-red-900/30 border border-red-700/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !charValid}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analyzing…
              </>
            ) : (
              "Review My Resume"
            )}
          </button>
        </form>

        {/* Results */}
        {/* Bug 6 fixed: gate on both review AND meta being non-null */}
        {review && meta && (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* Score + Summary */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col sm:flex-row gap-6 items-center shadow-xl">
              <ScoreDial score={review.overallScore} />
              <div className="flex-1 space-y-1">
                <h2 className="text-base font-semibold text-slate-200">
                  Summary
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {review.summary}
                </p>
              </div>
            </div>

            {/* Strengths + Gaps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section
                title="Strengths"
                icon="💪"
                items={review.strengths}
                variant="green"
              />
              <Section
                title="Gaps"
                icon="⚠️"
                items={review.gaps}
                variant="red"
              />
            </div>

            {/* Suggestions */}
            <Section
              title="Actionable Suggestions"
              icon="💡"
              items={review.suggestions}
              variant="blue"
            />

            {/* Missing Keywords */}
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span>🔍</span> Missing ATS Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {review.missingKeywords.map((kw) => (
                  <Tag key={kw} text={kw} variant="yellow" />
                ))}
              </div>
            </div>

            {/* Meta footer */}
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-5 py-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Model: <span className="text-slate-400">{meta.model}</span></span>
              <span>Tokens: <span className="text-slate-400">{meta.tokensUsed.toLocaleString()}</span></span>
              <span className="truncate">ID: <span className="text-slate-400 font-mono">{meta.responseId}</span></span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
