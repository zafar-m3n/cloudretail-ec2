import React from "react";

export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10">
      <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-gray-600 animate-spin" />
      <span className="text-gray-700 text-sm font-medium tracking-wide">{label}</span>
    </div>
  );
}
