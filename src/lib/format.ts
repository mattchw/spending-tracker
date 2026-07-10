export const money = (n: number, ccy = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: ccy || "GBP",
    maximumFractionDigits: 2,
  }).format(n);

export const monthLabel = (m: string) =>
  new Date(`${m}-01`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

export const monthShort = (m: string) =>
  new Date(`${m}-01`).toLocaleDateString("en-GB", { month: "short" });

// Month name only, from a "YYYY-MM" string.
export const monthName = (m: string) =>
  new Date(`${m}-01`).toLocaleDateString("en-GB", { month: "long" });

export const dayLabel = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
