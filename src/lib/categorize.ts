// Simple rules-based categorisation. Each rule matches the transaction
// description (case-insensitive). First match wins. Tweak freely — this is
// where most of the "smart" behaviour of a personal tracker lives.
const RULES: { category: string; patterns: RegExp[] }[] = [
  { category: "Groceries", patterns: [/tesco|sainsbury|asda|aldi|lidl|morrison|waitrose|co-?op|iceland|ocado|marks ?&? ?spencer|m&s food/i] },
  { category: "Eating out", patterns: [/deliveroo|just ?eat|uber ?eats|nando|greggs|mcdonald|kfc|pret|costa|starbucks|caffe nero|domino|pizza|restaurant|cafe|burger/i] },
  { category: "Transport", patterns: [/tfl|trainline|uber|bolt|addison lee|national rail|\bttl\b|oyster|parking|shell|bp |esso|texaco|petrol|fuel/i] },
  { category: "Car", patterns: [/dvla|\bmot\b|halfords|kwik ?fit|car insurance|autoglass|euro ?car ?parts|\brac\b|breakdown cover|congestion charge|\bdvsa\b/i] },
  { category: "Shopping", patterns: [/amazon|ebay|argos|john lewis|next |asos|zara|primark|apple\.com|paypal/i] },
  { category: "Bills & utilities", patterns: [/british gas|edf|octopus energy|eon|ovo|thames water|council tax|tv licen|virgin media|sky|bt |vodafone|\bo2\b|three|ee /i] },
  { category: "Subscriptions", patterns: [/netflix|spotify|disney|prime video|youtube|icloud|dropbox|adobe|gym|puregym|the gym/i] },
  { category: "Housing", patterns: [/rent|mortgage|landlord|letting/i] },
  { category: "Health", patterns: [/pharmacy|boots|superdrug|nhs|dentist|optician|specsavers/i] },
  { category: "Income", patterns: [/salary|payroll|wages|hmrc|refund|interest paid|dividend/i] },
  { category: "Transfers", patterns: [/transfer|xfer|standing order|faster payment|\bfps\b|monzo|revolut|starling/i] },
  { category: "Cash", patterns: [/cash withdrawal|atm|link atm/i] },
];

export function categorize(description: string, direction: "in" | "out"): string {
  const text = description || "";
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.category;
  }
  return direction === "in" ? "Other income" : "Uncategorised";
}

// Categories offered in the manual picker (rule categories + common extras).
export const CATEGORIES: string[] = [
  ...RULES.map((r) => r.category),
  "Other income",
  "Entertainment",
  "Travel",
  "Education",
  "Wedding",
  "Gifts & donations",
  "Fees & charges",
  "Savings & investments",
  "Uncategorised",
];

// A recognisable emoji per category, shown alongside the name across the UI.
export const CATEGORY_EMOJI: Record<string, string> = {
  Groceries: "🛒",
  "Eating out": "🍽️",
  Transport: "🚌",
  Car: "🚗",
  Shopping: "🛍️",
  "Bills & utilities": "💡",
  Subscriptions: "🔁",
  Housing: "🏠",
  Health: "💊",
  Income: "💰",
  Transfers: "🔄",
  Cash: "💵",
  "Other income": "💸",
  Entertainment: "🎬",
  Travel: "✈️",
  Education: "🎓",
  Wedding: "💍",
  "Gifts & donations": "🎁",
  "Fees & charges": "🏦",
  "Savings & investments": "📈",
  Uncategorised: "🏷️",
};

export const categoryEmoji = (category: string): string =>
  CATEGORY_EMOJI[category] ?? "🏷️";

/** Category name prefixed with its emoji, e.g. "🛒 Groceries". */
export const categoryLabel = (category: string): string =>
  `${categoryEmoji(category)} ${category}`;

/**
 * Normalise a description into a stable key for learned rules: lowercase,
 * strip digits and punctuation, collapse whitespace. This lets look-alike
 * transactions (e.g. "TESCO 1234 LONDON" vs "TESCO 9987 LONDON") share a rule.
 */
export function normalizeKey(description: string): string {
  return (description || "")
    .toLowerCase()
    .replace(/[0-9]+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
