export function parseWikiContent(content: string) {
  if (!content) return null;

  try {
    const textWithoutTemplates = content.replace(/\{\{[^}]*\}\}/g, '').trim();

    let html = textWithoutTemplates.replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_match, link, display) => {
        const displayText = display || link;
        return `<a href="https://www.snpedia.com/index.php/${link}" target="_blank" rel="noopener noreferrer">${displayText}</a>`;
      }
    );

    html = html
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed) return `<p>${trimmed}</p>`;
        return '';
      })
      .filter((line) => line)
      .join('');

    return { text: textWithoutTemplates, html };
  } catch (error) {
    console.error('Error parsing wiki content:', error);
    return null;
  }
}

export function extractTemplateData(content: string): Record<string, unknown> | null {
  if (!content) return null;

  try {
    const templateMatch = content.match(/\{\{([^}]+)\}\}/);
    if (!templateMatch) return null;

    const templateContent = templateMatch[1];
    const data: Record<string, unknown> = {};
    const parts = templateContent.split('|');

    for (const part of parts) {
      const eqIndex = part.indexOf('=');
      if (eqIndex > 0) {
        const key = part.substring(0, eqIndex).trim();
        const value = part.substring(eqIndex + 1).trim();
        if (key && value) {
          const numValue = parseFloat(value);
          data[key] = !isNaN(numValue) && String(numValue) === value ? numValue : value;
        }
      }
    }

    return Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error('Error extracting template data:', error);
    return null;
  }
}
