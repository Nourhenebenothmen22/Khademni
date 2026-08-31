"use client";

import React, { useState, forwardRef } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rightLabel?: React.ReactNode;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, rightLabel, error, helperText, icon: Icon, className = "", id, disabled, type = "text", ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1">
        {(label || rightLabel) && (
          <div className="flex items-center justify-between">
            {label && (
              <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
                {label}
              </label>
            )}
            {rightLabel}
          </div>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <Icon className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={`w-full rounded-xl border bg-white text-slate-900 placeholder-slate-400 py-2.5 text-sm transition-all focus:outline-hidden ${
              Icon ? "pl-10" : "pl-4"
            } pr-4 ${
              error
                ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                : "border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            } ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" : ""
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs font-medium text-rose-600 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, rightLabel, error, helperText, icon: Icon, className = "", id, disabled, showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="w-full space-y-1">
        {(label || rightLabel) && (
          <div className="flex items-center justify-between">
            {label && (
              <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
                {label}
              </label>
            )}
            {rightLabel}
          </div>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <Icon className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
          )}
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
            disabled={disabled}
            className={`w-full rounded-xl border bg-white text-slate-900 placeholder-slate-400 py-2.5 text-sm transition-all focus:outline-hidden ${
              Icon ? "pl-10" : "pl-4"
            } ${showToggle ? "pr-11" : "pr-4"} ${
              error
                ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                : "border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            } ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" : ""
            } ${className}`}
            {...props}
          />
          {showToggle && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={disabled}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition-colors cursor-pointer shrink-0"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-xs font-medium text-rose-600 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
