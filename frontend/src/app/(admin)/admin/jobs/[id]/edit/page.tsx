"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchJobById,
  updateJob,
  fetchJobKeywords,
  addJobKeywords,
  removeJobKeyword,
  fetchJobMatchingRules,
  addJobMatchingRule,
  removeJobMatchingRule,
} from "@/features/jobs/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { JobStatus, KeywordType, RuleType } from "@/types/backend";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export default function EditJobPage({ params }: { params?: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || (params ? use(params).id : "");
  const queryClient = useQueryClient();

  const { data: jobRes } = useQuery({
    queryKey: ["adminJobDetail", id],
    queryFn: () => fetchJobById(id),
  });

  const job = jobRes?.data;

  const [titleInput, setTitleInput] = useState<string | null>(null);
  const [descInput, setDescInput] = useState<string | null>(null);
  const [reqInput, setReqInput] = useState<string | null>(null);
  const [statusInput, setStatusInput] = useState<JobStatus | null>(null);

  const title = titleInput ?? (job?.title || "");
  const description = descInput ?? (job?.description || "");
  const requirements = reqInput ?? (job?.requirements || "");
  const status = statusInput ?? (job?.status || "PUBLISHED");

  // Keyword Form State
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordType, setKeywordType] = useState<KeywordType>("REQUIRED");
  const [keywordWeight, setKeywordWeight] = useState(1.0);

  // Rule Form State
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<RuleType>("DEGREE");
  const [ruleConditionJson, setRuleConditionJson] = useState('{"degree": "Master", "rank": 2}');
  const [ruleWeight, setRuleWeight] = useState(1.0);

  const { data: keywordsRes } = useQuery({
    queryKey: ["adminJobKeywords", id],
    queryFn: () => fetchJobKeywords(id),
  });

  const { data: rulesRes } = useQuery({
    queryKey: ["adminJobRules", id],
    queryFn: () => fetchJobMatchingRules(id),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateJob(id, { title, description, requirements, status }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Job post updated!");
        queryClient.invalidateQueries({ queryKey: ["adminJobDetail", id] });
      } else {
        toast.error(res.message || "Update failed");
      }
    },
  });

  const addKeywordMutation = useMutation({
    mutationFn: () => addJobKeywords(id, [{ keyword: newKeyword, type: keywordType, weight: keywordWeight }]),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Keyword added!");
        setNewKeyword("");
        queryClient.invalidateQueries({ queryKey: ["adminJobKeywords", id] });
      } else {
        toast.error(res.message || "Failed to add keyword");
      }
    },
  });

  const removeKeywordMutation = useMutation({
    mutationFn: (keywordId: string) => removeJobKeyword(id, keywordId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Keyword removed");
        queryClient.invalidateQueries({ queryKey: ["adminJobKeywords", id] });
      }
    },
  });

  const addRuleMutation = useMutation({
    mutationFn: () => {
      const parsedCondition = JSON.parse(ruleConditionJson);
      return addJobMatchingRule(id, {
        ruleName,
        type: ruleType,
        condition: parsedCondition,
        weight: ruleWeight,
      });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Matching rule added!");
        setRuleName("");
        queryClient.invalidateQueries({ queryKey: ["adminJobRules", id] });
      } else {
        toast.error(res.message || "Failed to add matching rule");
      }
    },
    onError: () => {
      toast.error("Invalid JSON condition format");
    },
  });

  const removeRuleMutation = useMutation({
    mutationFn: (ruleId: string) => removeJobMatchingRule(id, ruleId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Rule removed");
        queryClient.invalidateQueries({ queryKey: ["adminJobRules", id] });
      }
    },
  });

  const keywords = keywordsRes?.data || [];
  const rules = rulesRes?.data || [];

  return (
    <DashboardShell requiredRole="ADMIN">
      <div className="space-y-8 max-w-4xl">
        <Link href="/admin/jobs" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs Directory
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Job Post & Matching Rules</h1>
          <p className="mt-1 text-sm text-slate-600">ID: {id}</p>
        </div>

        {/* Form 1: Job Post Details */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">1. Core Information</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Requirements</label>
            <textarea
              required
              rows={3}
              value={requirements}
              onChange={(e) => setReqInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatusInput(e.target.value as JobStatus)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Update Core Info
          </button>
        </form>

        {/* Section 2: Keywords Management */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">2. Keywords & Skills Engine</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Keyword (e.g. Mathematics)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="rounded-lg border border-slate-300 p-2 text-sm"
            />
            <select
              value={keywordType}
              onChange={(e) => setKeywordType(e.target.value as KeywordType)}
              className="rounded-lg border border-slate-300 p-2 text-sm"
            >
              <option value="REQUIRED">REQUIRED</option>
              <option value="OPTIONAL">OPTIONAL</option>
              <option value="BONUS">BONUS</option>
            </select>
            <input
              type="number"
              step="0.1"
              value={keywordWeight}
              onChange={(e) => setKeywordWeight(parseFloat(e.target.value))}
              className="rounded-lg border border-slate-300 p-2 text-sm"
            />
            <button
              onClick={() => addKeywordMutation.mutate()}
              disabled={!newKeyword || addKeywordMutation.isPending}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Keyword
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {keywords.map((kw) => (
              <span key={kw.id} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border">
                {kw.keyword} ({kw.type}, {kw.weight}x)
                <button onClick={() => removeKeywordMutation.mutate(kw.id)} className="text-rose-600 hover:text-rose-800">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Section 3: Matching Rules Engine */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">3. Rule Engine Rules</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Rule Name (e.g. Master Degree Rule)"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="rounded-lg border border-slate-300 p-2 text-sm"
              />
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as RuleType)}
                className="rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="DEGREE">DEGREE</option>
                <option value="EXPERIENCE">EXPERIENCE</option>
                <option value="CERTIFICATION">CERTIFICATION</option>
                <option value="KEYWORD">KEYWORD</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
              <input
                type="number"
                step="0.1"
                value={ruleWeight}
                onChange={(e) => setRuleWeight(parseFloat(e.target.value))}
                className="rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Condition JSON Schema</label>
              <textarea
                rows={2}
                value={ruleConditionJson}
                onChange={(e) => setRuleConditionJson(e.target.value)}
                className="w-full font-mono text-xs rounded-lg border border-slate-300 p-2 bg-slate-900 text-slate-100"
              />
            </div>
            <button
              onClick={() => addRuleMutation.mutate()}
              disabled={!ruleName || addRuleMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Rule
            </button>
          </div>

          <div className="divide-y divide-slate-100 pt-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between py-3">
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">{rule.ruleName} ({rule.type})</h4>
                  <pre className="text-[11px] font-mono text-slate-500">{JSON.stringify(rule.condition)}</pre>
                </div>
                <button
                  onClick={() => removeRuleMutation.mutate(rule.id)}
                  className="text-rose-600 hover:text-rose-800 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
