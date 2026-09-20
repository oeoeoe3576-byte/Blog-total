"use client";

const LABELS: Record<string, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  데모: "데모",
};

export function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider) return null;
  const paid = provider === "openai";
  const label = LABELS[provider] ?? provider;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        paid ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-700"
      }`}
    >
      {label} · {paid ? "유료" : "무료"}
    </span>
  );
}
