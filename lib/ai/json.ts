export function parseFirstJsonValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {
    // Continue to the bounded object/array extractor below.
  }

  const objectStart = unfenced.indexOf('{');
  const arrayStart = unfenced.indexOf('[');
  let start = -1;
  if (objectStart >= 0 && arrayStart >= 0) start = Math.min(objectStart, arrayStart);
  else start = Math.max(objectStart, arrayStart);
  if (start < 0) return null;

  const opening = unfenced[start];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < unfenced.length; i += 1) {
    const char = unfenced[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === opening) depth += 1;
    if (char === closing) depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(unfenced.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

