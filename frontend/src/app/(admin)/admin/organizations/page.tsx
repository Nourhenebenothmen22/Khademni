"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyOrganization,
  updateMyOrganization,
  uploadOrganizationLogo,
  deleteOrganizationLogo,
  type UpdateOrganizationPayload,
} from "@/features/organizations/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getOrgLogoImageUrl } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  MapPin,
  Mail,
  Phone,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Share2,
  Link as LinkIcon,
  Sparkles,
  Save,
  Loader2,
} from "lucide-react";

export default function AdminOrganizationsPage() {
  const queryClient = useQueryClient();

  const { data: orgData, isLoading } = useQuery({
    queryKey: ["myOrganizationProfile"],
    queryFn: () => fetchMyOrganization(),
  });

  const org = orgData?.data;

  const [formData, setFormData] = useState<UpdateOrganizationPayload>({
    name: "",
    slug: "",
    domain: "",
    website: "",
    description: "",
    industry: "Higher Education",
    location: "",
    address: "",
    phone: "",
    email: "",
    country: "Tunisia",
    city: "Tunis",
    socialLinks: {
      linkedin: "",
      twitter: "",
      facebook: "",
    },
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (org) {
      setFormData({
        name: org.name || "",
        slug: org.slug || "",
        domain: org.domain || "",
        website: org.website || "",
        description: org.description || "",
        industry: org.industry || "Higher Education",
        location: org.location || "",
        address: org.address || "",
        phone: org.phone || "",
        email: org.email || "",
        country: org.country || "Tunisia",
        city: org.city || "Tunis",
        socialLinks: (org.socialLinks as Record<string, string>) || {
          linkedin: "",
          twitter: "",
          facebook: "",
        },
      });
      if (org.logoUrl) {
        setLogoPreview(getOrgLogoImageUrl(org.logoUrl));
      }
    }
  }, [org]);

  // Profile completion calculation
  const mandatoryFields = [
    { key: "name", label: "Organization Name", valid: Boolean(formData.name?.trim()) },
    { key: "slug", label: "Slug Identifier", valid: Boolean(formData.slug?.trim()) },
    { key: "description", label: "Description (min 10 chars)", valid: Boolean(formData.description && formData.description.length >= 10) },
    { key: "location", label: "Location / Campus", valid: Boolean(formData.location?.trim()) },
  ];

  const optionalFields = [
    { key: "website", label: "Website", valid: Boolean(formData.website?.trim()) },
    { key: "email", label: "Contact Email", valid: Boolean(formData.email?.trim()) },
    { key: "phone", label: "Contact Phone", valid: Boolean(formData.phone?.trim()) },
    { key: "logo", label: "Organization Logo", valid: Boolean(org?.logoUrl || logoPreview) },
  ];

  const mandatoryCompleted = mandatoryFields.filter((f) => f.valid).length;
  const isPublishReady = mandatoryCompleted === mandatoryFields.length;
  const totalCompletionPercent = Math.round(
    ((mandatoryCompleted + optionalFields.filter((f) => f.valid).length) /
      (mandatoryFields.length + optionalFields.length)) *
      100
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await updateMyOrganization(formData);
      if (!res.success) throw new Error(res.message || "Failed to update organization profile");

      if (logoFile && org?.id) {
        await uploadOrganizationLogo(org.id, logoFile);
      }
      return res;
    },
    onSuccess: () => {
      toast.success("Organization profile updated successfully!");
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ["myOrganizationProfile"] });
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Failed to save profile changes");
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      if (!org?.id) return;
      return deleteOrganizationLogo(org.id);
    },
    onSuccess: () => {
      toast.success("Organization logo removed.");
      setLogoPreview(null);
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ["myOrganizationProfile"] });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file size must be less than 2MB");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSocialChange = (network: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...(prev.socialLinks || {}),
        [network]: value,
      },
    }));
  };

  return (
    <DashboardShell requiredRole="ORGANIZATION_ADMIN">
      <div className="space-y-8 max-w-5xl mx-auto pb-16">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Building2 className="h-7 w-7 text-indigo-600" />
              Organization Profile & Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure your school branding, contact details, campus location, and public recruitment profile.
            </p>
          </div>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>

        {/* Profile Completion Gate Status Card */}
        <div
          className={`rounded-2xl border p-5 transition-all ${
            isPublishReady
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
              : "bg-amber-50/80 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {isPublishReady ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="text-base font-bold">
                  {isPublishReady
                    ? "Organization Profile Complete"
                    : "Complete Organization Profile to Publish Jobs"}
                </h3>
                <p className="text-xs sm:text-sm mt-0.5 opacity-90">
                  {isPublishReady
                    ? "Your institution profile contains all mandatory fields. You can create and publish job offers to prospective teachers."
                    : "Mandatory fields are required before publishing job openings to candidates."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider block opacity-75">
                  Profile Status
                </span>
                <span className="text-lg font-black">{totalCompletionPercent}%</span>
              </div>
              <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isPublishReady ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${totalCompletionPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mandatory Checklist Chips */}
          <div className="mt-4 pt-3 border-t border-black/10 flex flex-wrap gap-2 text-xs font-medium">
            {mandatoryFields.map((field) => (
              <span
                key={field.key}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
                  field.valid
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                {field.valid ? "✓" : "✗"} {field.label}
              </span>
            ))}
          </div>
        </div>

        {/* Profile Settings Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Basic Information */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" /> Institution Identity
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iTeam University"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slug Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iteam-university"
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sector / Industry
                  </label>
                  <select
                    value={formData.industry || "Higher Education"}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="Higher Education">Higher Education / University</option>
                    <option value="Secondary Education">Secondary Education / High School</option>
                    <option value="Primary Education">Primary & Elementary School</option>
                    <option value="Vocational & Training">Vocational & Technical Institute</option>
                    <option value="EdTech & Academy">EdTech & Private Academy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Website
                  </label>
                  <div className="relative">
                    <Globe className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://iteam.tn"
                      value={formData.website || ""}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Domain (Optional)
                </label>
                <input
                  type="text"
                  placeholder="iteam.tn"
                  value={formData.domain || ""}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  About the Institution & Culture <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your school, mission, pedagogical values, and why teachers should join your academic team..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {formData.description?.length || 0} characters (minimum 10 characters required)
                </p>
              </div>
            </div>

            {/* Section 2: Location & Contact */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" /> Location & Contact Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Location / City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tunis, Tunisia"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Physical Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 85 Rue de la Liberté, Montplaisir"
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="recruitment@iteam.tn"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="+216 71 000 000"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Social & External Presence */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-600" /> Social Links
              </h2>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 font-bold text-xs">
                    in
                  </span>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/school/iteam-university"
                    value={formData.socialLinks?.linkedin || ""}
                    onChange={(e) => handleSocialChange("linkedin", e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shrink-0 font-bold text-xs">
                    X
                  </span>
                  <input
                    type="url"
                    placeholder="https://twitter.com/iteam_univ"
                    value={formData.socialLinks?.twitter || ""}
                    onChange={(e) => handleSocialChange("twitter", e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0 font-bold text-xs">
                    fb
                  </span>
                  <input
                    type="url"
                    placeholder="https://facebook.com/iteamuniversity"
                    value={formData.socialLinks?.facebook || ""}
                    onChange={(e) => handleSocialChange("facebook", e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Column: Branding & Live Public Preview */}
          <div className="space-y-6">
            {/* Logo Upload Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 text-center">
              <h3 className="text-sm font-bold text-slate-900 text-left">Institution Logo</h3>

              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden shadow-inner relative group">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Organization Logo"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-slate-300" />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Select New Logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>

                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => deleteLogoMutation.mutate()}
                    disabled={deleteLogoMutation.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Remove Logo
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">PNG, JPG, or WEBP up to 2MB</p>
            </div>

            {/* Live Candidate Job Card Preview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Public Job Preview
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Live View
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {formData.name || "Your Institution Name"}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {formData.location || "Campus Location"}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3">
                  {formData.description ||
                    "Institution description and cultural values will appear here on your public job posts..."}
                </p>

                {formData.website && (
                  <a
                    href={formData.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline pt-1"
                  >
                    <span>{formData.website.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
