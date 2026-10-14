// Bounded common assignment formats, not universal secret recognition.
const key = '(?:password|passwd|token|secret|api[-_]?key|access[-_]?(?:key|token)|authorization)';
const assignments = () => new RegExp(`(?:"${key}"|'${key}'|\\b${key})\\s*[:=]\\s*("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\\[REDACTED\\]|[^\\s,;]+)`, 'gi');
const environment = value => /^(?:\$\{[A-Za-z_][A-Za-z0-9_]*\}|\$[A-Za-z_][A-Za-z0-9_]*|%[A-Za-z_][A-Za-z0-9_]*%)$/.test(value);
export function credentialAssignments(text) {
  return [...text.matchAll(assignments())].map(match => {
    let value = match[1];
    if (value.startsWith('"')) { try { value = JSON.parse(value); } catch {} }
    else if (value.startsWith("'")) value = value.slice(1, -1);
    return {text: match[0], index: match.index, value, safe: environment(value) || value === '[REDACTED]'};
  });
}
export function redactCredentials(value, literals = [], depth = 0) {
  let text = String(value ?? '');
  // A log can itself contain a JSON-encoded JSON string. Decode only string
  // tokens, scrub recursively, and re-encode; preserve ordinary unchanged text.
  if (depth < 4) text = text.replace(/"(?:\\.|[^"\\])*"/g, token => {
    try {
      const decoded = JSON.parse(token);
      if (decoded === token.slice(1, -1)) return token;
      const scrubbed = redactCredentials(decoded, literals, depth + 1);
      return scrubbed === decoded ? token : JSON.stringify(scrubbed);
    } catch { return token; }
  });
  text = text.replace(/\b(Bearer\s+)\S+/gi, '$1[REDACTED]');
  text = text.replace(assignments(), (match, value) => {
    const entry = credentialAssignments(match)[0];
    const replacement = value.startsWith('"') ? '"[REDACTED]"' : value.startsWith("'") ? "'[REDACTED]'" : '[REDACTED]';
    return entry?.safe ? match : match.slice(0, -value.length) + replacement;
  });
  text = text.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, '[REDACTED PRIVATE KEY]')
    .replace(/\b(Bearer\s+)\S+/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@');
  for (const literal of [...literals].sort((a,b)=>b.length-a.length)) if (literal) text = text.replaceAll(literal, '[REDACTED]');
  return text;
}
