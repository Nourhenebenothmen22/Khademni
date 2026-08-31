"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser, fetchAvailableRoles, type AvailableRole } from "@/features/auth/api";
import { UserRole } from "@/types/backend";
import { PASSWORD_CONFIG } from "@/config/constants";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  Globe,
  MapPin,
  FileText,
  Upload,
  ChevronDown,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const DEFAULT_ROLES: AvailableRole[] = [
  {
    role: "CANDIDATE",
    label: "Candidate",
    description: "Apply to positions, manage CV, and track interview invitations on Khademni.",
    requiresOrganization: false,
  },
  {
    role: "ORGANIZATION_ADMIN",
    label: "Organization Admin",
    description: "Post job offers, manage school profile, run AI matching, and evaluate scorecards.",
    requiresOrganization: true,
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>(DEFAULT_ROLES);
  const [selectedRole, setSelectedRole] = useState<UserRole>("CANDIDATE");

  // User credentials
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Organization fields
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [orgDomain, setOrgDomain] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [logoFileName, setLogoFileName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAvailableRoles()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setAvailableRoles(res.data);
        }
      })
      .catch(() => {
        // Fallback to default roles
      });
  }, []);

  // Auto-slugify organization name if not manually edited
  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setOrgSlug(generated);
    }
  };

  const isOrgAdmin = selectedRole === "ORGANIZATION_ADMIN";

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "None", color: "bg-slate-200" };
    let score = 0;
    if (password.length >= PASSWORD_CONFIG.MIN_LENGTH) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-600" };
    if (score <= 3) return { score: 2, label: "Medium", color: "bg-amber-500", text: "text-amber-600" };
    return { score: 3, label: "Strong", color: "bg-emerald-500", text: "text-emerald-600" };
  }, [password]);

  // Validation checks
  const emailValid = useMemo(() => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const slugValid = useMemo(() => {
    if (!orgSlug) return true;
    return /^[a-z0-9-]+$/.test(orgSlug);
  }, [orgSlug]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file size must be less than 2MB.");
        return;
      }
      setLogoFileName(file.name);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailValid) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
      toast.error(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (isOrgAdmin) {
      if (!orgName.trim()) {
        toast.error("Please provide your Organization Name.");
        return;
      }
      if (!slugValid) {
        toast.error("Organization slug can only contain lowercase letters, numbers, and hyphens.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await registerUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: selectedRole,
        organizationName: isOrgAdmin ? orgName.trim() : undefined,
        organizationSlug: isOrgAdmin && orgSlug.trim() ? orgSlug.trim() : undefined,
        organizationDomain: isOrgAdmin && orgDomain.trim() ? orgDomain.trim() : undefined,
        organizationWebsite: isOrgAdmin && orgDomain.trim() ? orgDomain.trim() : undefined,
        organizationDescription: isOrgAdmin && orgDescription.trim() ? orgDescription.trim() : undefined,
        organizationLocation: isOrgAdmin && orgLocation.trim() ? orgLocation.trim() : undefined,
      });

      if (res.success) {
        toast.success("Account registered successfully with Khademni!");
        setRegisteredSuccess(true);
      } else {
        toast.error(res.message || "Registration failed. Please review your details.");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Registration error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const loginRedirectUrl = redirectParam
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/login";

  return (
    <div
      className={`w-full transition-all duration-300 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm ${
        isOrgAdmin ? "max-w-3xl" : "max-w-lg"
      }`}
    >
      {registeredSuccess ? (
        <div className="text-center space-y-4 py-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome to Khademni!
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Your {isOrgAdmin ? "organization admin workspace" : "candidate account"} has been created.
            We sent a verification link to <strong className="text-slate-900">{email}</strong>. Please
            verify your email to access your portal.
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push(loginRedirectUrl)}
              className="w-full sm:w-auto px-8 rounded-xl bg-[#282276] py-3 text-sm font-bold text-white hover:bg-[#1f1a5f] transition-colors shadow-sm"
            >
              Sign In to Khademni
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header & Khademni Brand */}
          <div className="mb-5 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Khademni Recruitment SaaS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create Your Account
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Join Khademni to connect institutions with verified academic talent
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Account Type Single Dropdown */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
              <label
                htmlFor="account-type-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Account Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="account-type-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm font-bold text-slate-800 shadow-2xs transition-colors focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 cursor-pointer"
                >
                  {availableRoles.map((r) => (
                    <option key={r.role} value={r.role} className="font-medium text-slate-800">
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                {isOrgAdmin
                  ? "Manage institution recruitment, publish job posts, run AI matching, and schedule interviews."
                  : "Search verified academic vacancies, submit CV applications, and track interview progress."}
              </p>
            </div>

            {/* Form Fields: Grid for Organization Admin, Single Column for Candidate */}
            <div className={isOrgAdmin ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3.5"}>
              {/* Column 1: Account Credentials */}
              <div className="space-y-3">
                {isOrgAdmin && (
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-xs font-bold text-slate-800">
                    <User className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Administrator Account</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isOrgAdmin ? "Dr. Ahmed Mansour" : "Jane Doe"}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                      placeholder={isOrgAdmin ? "admin@institution.edu" : "candidate@example.com"}
                      className={`w-full rounded-xl border pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        touched.email && !emailValid
                          ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                      }`}
                    />
                  </div>
                  {touched.email && !emailValid && (
                    <p className="text-[11px] text-rose-600 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Please enter a valid email address.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={PASSWORD_CONFIG.MIN_LENGTH}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`Min ${PASSWORD_CONFIG.MIN_LENGTH} characters`}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Strength:</span>
                        <span className={`font-bold ${passwordStrength.text}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                        <div
                          className={`h-full rounded-full transition-all ${
                            passwordStrength.score >= 1 ? passwordStrength.color : "bg-transparent"
                          } w-1/3`}
                        />
                        <div
                          className={`h-full rounded-full transition-all ${
                            passwordStrength.score >= 2 ? passwordStrength.color : "bg-transparent"
                          } w-1/3`}
                        />
                        <div
                          className={`h-full rounded-full transition-all ${
                            passwordStrength.score >= 3 ? passwordStrength.color : "bg-transparent"
                          } w-1/3`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className={`w-full rounded-xl border pl-10 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        confirmPassword && !passwordsMatch
                          ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-[11px] text-rose-600 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Passwords do not match.
                    </p>
                  )}
                </div>
              </div>

              {/* Column 2: Organization Setup (Only when Organization Admin is selected) */}
              {isOrgAdmin && (
                <div className="space-y-3 bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-indigo-100 text-xs font-bold text-indigo-900">
                    <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Organization Profile</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Organization Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required={isOrgAdmin}
                        value={orgName}
                        onChange={(e) => handleOrgNameChange(e.target.value)}
                        placeholder="e.g. iTeam University"
                        className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Slug Identifier <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={isOrgAdmin}
                      value={orgSlug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                      }}
                      placeholder="iteam-university"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      khademni.tn/org/{orgSlug || "slug"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Website / Domain
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={orgDomain}
                          onChange={(e) => setOrgDomain(e.target.value)}
                          placeholder="iteam.tn"
                          className="w-full rounded-xl border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Campus Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={orgLocation}
                          onChange={(e) => setOrgLocation(e.target.value)}
                          placeholder="Tunis, Tunisia"
                          className="w-full rounded-xl border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      About Institution & Mission
                    </label>
                    <textarea
                      rows={2}
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                      placeholder="Brief description of school and academic programs..."
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 bg-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institution Logo (Optional)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-2 text-xs text-slate-600 hover:border-indigo-500 transition-colors">
                      <Upload className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span className="truncate">
                        {logoFileName || "Upload school crest / logo (PNG, JPG < 2MB)"}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (confirmPassword ? !passwordsMatch : false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#282276] py-3 text-sm font-bold text-white hover:bg-[#1f1a5f] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Registering with Khademni...</span>
                  </>
                ) : (
                  <span>
                    {isOrgAdmin ? "Register Institution & Admin" : "Create Candidate Account"}
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Footer link to sign in */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            Already registered on Khademni?{" "}
            <Link href={loginRedirectUrl} className="font-bold text-[#282276] hover:underline">
              Sign In to your portal
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <Suspense
          fallback={
            <div className="h-96 w-full max-w-lg bg-white rounded-2xl animate-pulse border border-slate-200" />
          }
        >
          <RegisterForm />
        </Suspense>
      </main>
    </div>
  );
}
