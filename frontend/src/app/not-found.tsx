import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-20 w-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-3xl mb-4">
        404
      </div>
      <h1 className="text-3xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mt-2 text-slate-600 max-w-md">
        The requested endpoint or frontend route does not exist in Khademni ATS.
      </p>
      <Link
        href="/jobs"
        className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
      >
        Return to Home Page
      </Link>
    </div>
  );
}
