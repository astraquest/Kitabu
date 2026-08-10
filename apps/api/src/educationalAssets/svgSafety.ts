const unsafeSvgPattern = /<\s*(?:script|foreignObject|iframe|object|embed|audio|video)\b|\bon\w+\s*=|\b(?:href|xlink:href)\s*=\s*["']?\s*(?:javascript:|data:|https?:|\/\/)|@import\b/i;

export function assertSafeEducationalAssetSvg(svg: string): void {
  if (!/<svg\b/i.test(svg) || unsafeSvgPattern.test(svg)) {
    throw new Error('SVG contains unsupported or unsafe content');
  }
}

export function isSafeEducationalAssetSvg(svg: string): boolean {
  try { assertSafeEducationalAssetSvg(svg); return true; } catch { return false; }
}
