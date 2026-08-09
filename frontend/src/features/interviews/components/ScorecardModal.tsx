"use client";

import { useState } from "react";
import { Star, CheckCircle, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitScorecardApi } from "../api/interviews-api";
import type { ScorecardRecommendation } from "@/types/backend";

interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  interviewId: string;
  candidateName: string;
  jobTitle: string;
  interviewType: string;
}

const DEFAULT_CRITERIA = [
  { category: "Teaching Methodology", criterion: "Pedagogical Clarity & Lesson Structure" },
  { category: "Subject Knowledge", criterion: "Command of Discipline & Curriculum" },
  { category: "Communication", criterion: "Verbal Articulation & Student Engagement" },
  { category: "Classroom Management", criterion: "Adaptability & Student Behavior Strategy" },
  { category: "Culture & Values", criterion: "Professional Ethics & School Alignment" },
];

export function ScorecardModal({
  isOpen,
  onClose,
  onSuccess,
  interviewId,
  candidateName,
  jobTitle,
  interviewType,
}: ScorecardModalProps) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<ScorecardRecommendation>("RECOMMENDED" as ScorecardRecommendation);
  const [overallNotes, setOverallNotes] = useState("");
  const [scores, setScores] = useState<Record<string, { score: number; comment: string }>>(
    DEFAULT_CRITERIA.reduce((acc, cur, idx) => ({ ...acc, [idx]: { score: 4, comment: "" } }), {}),
  );

  if (!isOpen) return null;

  const handleScoreChange = (index: number, score: number) => {
    setScores((prev) => ({
      ...prev,
      [index]: { ...prev[index], score },
    }));
  };

  const handleCommentChange = (index: number, comment: string) => {
    setScores((prev) => ({
      ...prev,
      [index]: { ...prev[index], comment },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!overallNotes || overallNotes.trim().length < 5) {
      toast.error("Please provide overall evaluation notes (at least 5 characters)");
      return;
    }

    const criteriaScores = DEFAULT_CRITERIA.map((item, idx) => ({
      category: item.category,
      criterion: item.criterion,
      score: scores[idx]?.score || 3,
      comment: scores[idx]?.comment || undefined,
    }));

    setLoading(true);
    try {
      const res = await submitScorecardApi(interviewId, {
        recommendation,
        overallNotes,
        criteriaScores,
      });

      if (res.success) {
        toast.success("Scorecard submitted successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || "Failed to submit scorecard");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              Candidate Scorecard & Evaluation
            </h3>
            <p className="text-xs text-zinc-500">
              Candidate: <span className="font-medium text-zinc-700">{candidateName}</span> • {interviewType} • {jobTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Recommendation Options */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
              Final Recommendation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: "STRONG_HIRE", label: "Strong Hire", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
                { value: "HIRE", label: "Hire", color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
                { value: "NEUTRAL", label: "Neutral", color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
                { value: "NO_HIRE", label: "No Hire", color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
                { value: "STRONG_NO_HIRE", label: "Strong No Hire", color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setRecommendation(opt.value as ScorecardRecommendation)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    recommendation === opt.value
                      ? `${opt.color} ring-2 ring-blue-500 font-bold shadow-xs`
                      : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Criteria Star Rating */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Evaluation Criteria Ratings (1–5)
            </label>

            {DEFAULT_CRITERIA.map((item, idx) => (
              <div key={idx} className="p-3 border border-zinc-100 rounded-lg bg-zinc-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 mr-2">{item.category}</span>
                    <span className="text-xs text-zinc-600 font-medium">{item.criterion}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => handleScoreChange(idx, star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= (scores[idx]?.score || 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Optional criterion notes..."
                  value={scores[idx]?.comment || ""}
                  onChange={(e) => handleCommentChange(idx, e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-800 focus:outline-hidden"
                />
              </div>
            ))}
          </div>

          {/* Overall Feedback */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
              Overall Qualitative Summary & Justification
            </label>
            <textarea
              rows={3}
              required
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="Candidate demonstrated exceptional subject mastery in mathematics, clear voice projection, and structured lesson delivery..."
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Evaluation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
