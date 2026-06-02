/**
 * Fast prefix/substring fuzzy scorer used by the command palette.
 * Returns a score 0–100 (0 = no match, higher = better match).
 */
export function fuzzyScore(label: string, query: string): number {
  if (!query) return 0;
  const l = label.toLowerCase();
  if (l === query) return 100;
  if (l.startsWith(query)) return 80;
  const words = l.split(/[\s\-_()[\]]/);
  if (words.some(w => w.startsWith(query))) return 60;
  if (l.includes(query)) return 40;
  return 0;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarity(a: string, b: string): number {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export interface FuzzyMatch {
  item: string;
  score: number;
}

export function findBestMatch(query: string, candidates: string[], threshold = 0.75): FuzzyMatch | null {
  let best: FuzzyMatch | null = null;
  for (const candidate of candidates) {
    const score = similarity(query, candidate);
    if (score >= threshold && (!best || score > best.score)) {
      best = { item: candidate, score };
    }
  }
  return best;
}
