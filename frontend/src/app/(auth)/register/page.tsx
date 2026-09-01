"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser } from "@/features/auth/api";
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
  Building2,
  Globe,
  Link2,
  Upload,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [selectedRole, setSelectedRole] = useState<UserRole>("ORGANIZATION_ADMIN");

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
  const [logoFileName, setLogoFileName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

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

  // Validation checks
  const emailValid = useMemo(() => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const slugValid = useMemo(() => {
    if (!orgSlug) return true;
    return /^[a-z0-9-]+$/.test(orgSlug);
  }, [orgSlug]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Le logo doit faire moins de 2 Mo.");
        return;
      }
      setLogoFileName(file.name);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailValid) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }

    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
      toast.error(`Le mot de passe doit contenir au moins ${PASSWORD_CONFIG.MIN_LENGTH} caractères.`);
      return;
    }

    if (!isOrgAdmin && password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    if (isOrgAdmin) {
      if (!orgName.trim()) {
        toast.error("Veuillez saisir le nom de votre organisation.");
        return;
      }
      if (!slugValid) {
        toast.error("Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.");
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
      });

      if (res.success) {
        toast.success("Compte créé avec succès !");
        setRegisteredSuccess(true);
      } else {
        toast.error(res.message || "Échec de l'inscription. Veuillez vérifier vos données.");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const loginRedirectUrl = redirectParam
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/login";

  return (
    <div
      className={`w-full transition-all duration-200 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 shadow-xs ${
        isOrgAdmin ? "max-w-2xl lg:max-w-3xl" : "max-w-md"
      }`}
    >
      {registeredSuccess ? (
        <div className="text-center space-y-3 py-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Bienvenue sur Khademni !
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            Votre {isOrgAdmin ? "espace administrateur d'établissement" : "compte candidat"} a été créé.
            Un email de confirmation a été envoyé à <strong className="text-slate-900">{email}</strong>.
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push(loginRedirectUrl)}
              className="w-full sm:w-auto px-6 rounded-xl bg-[#4338ca] hover:bg-[#3730a3] py-2.5 text-xs sm:text-sm font-bold text-white transition-colors shadow-xs"
            >
              Se connecter à Khademni
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header Title & Subtitle */}
          <div className="mb-3.5 text-center">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Créer un compte
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">
              Plateforme intelligente de recrutement d&apos;enseignants
            </p>
          </div>

          {/* Segmented Pill Tabs */}
          <div className="mx-auto max-w-sm flex items-center rounded-xl bg-slate-100 p-1 mb-4 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setSelectedRole("CANDIDATE")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isOrgAdmin
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🎓 Candidat</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("ORGANIZATION_ADMIN")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isOrgAdmin
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏫 Établissement / École</span>
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-3">
            {isOrgAdmin ? (
              /* Two Column Layout for Organization Admin */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2.5">
                {/* Left Column: Informations Établissement */}
                <div className="space-y-2">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-0.5">
                    INFORMATIONS ÉTABLISSEMENT
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                      Nom de l&apos;Organisation <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => handleOrgNameChange(e.target.value)}
                        placeholder="École Internationale"
                        className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] sm:text-xs font-semibold text-slate-700">
                        Identifiant URL (Slug) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[9px] sm:text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100">
                        /org/slug
                      </span>
                    </div>
                    <div className="relative">
                      <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={orgSlug}
                        onChange={(e) => {
                          setSlugManuallyEdited(true);
                          setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                        }}
                        placeholder="ecole-internationale"
                        className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                      Domaine Web (Optionnel)
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={orgDomain}
                        onChange={(e) => setOrgDomain(e.target.value)}
                        placeholder="eic.education.tn"
                        className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Administrateur & Logo */}
                <div className="space-y-2">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-0.5">
                    ADMINISTRATEUR & LOGO
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                      Nom du responsable <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Dr. Mohamed Aloui"
                        className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                      Email professionnel <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="benothmennourhen8@gmail.com"
                        className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                      Mot de passe <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={PASSWORD_CONFIG.MIN_LENGTH}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-slate-200 pl-8 pr-8 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                      Logo Officiel (Optionnel)
                    </label>
                    <label className="flex items-center justify-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-1.5 px-3 text-xs text-slate-600 hover:bg-slate-100/60 hover:border-indigo-500 transition-colors">
                      <ImageIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-[11px] font-medium">
                        {logoFileName || "Choisir un logo"}
                      </span>
                      <Upload className="h-3 w-3 text-slate-400 shrink-0 ml-auto" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              /* Single Column Layout for Candidate */
              <div className="space-y-2.5 max-w-sm mx-auto">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                    Nom complet <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                    Email personnel <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                    Mot de passe <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={PASSWORD_CONFIG.MIN_LENGTH}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-8 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                    Confirmer le mot de passe <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-8 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/20 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4338ca] hover:bg-[#3730a3] py-2.5 text-xs sm:text-sm font-bold text-white disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Création du compte en cours...</span>
                  </>
                ) : (
                  <span>
                    {isOrgAdmin
                      ? "Créer l'Établissement & Compte Admin"
                      : "Créer mon Compte Candidat"}
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Footer Link */}
          <div className="mt-2.5 text-center text-[11px] sm:text-xs text-slate-500">
            Vous avez déjà un compte ?{" "}
            <Link href={loginRedirectUrl} className="font-bold text-indigo-600 hover:underline">
              Se connecter
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="h-[100dvh] max-h-screen overflow-hidden bg-[#f8fafc] flex flex-col justify-between">
      <Header />

      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <Suspense
          fallback={
            <div className="h-80 w-full max-w-lg bg-white rounded-2xl animate-pulse border border-slate-200" />
          }
        >
          <RegisterForm />
        </Suspense>
      </main>
    </div>
  );
}
