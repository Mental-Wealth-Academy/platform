/**
 * Utilities for formatting and simplifying guide evidence criteria into
 * concise, direct wellness summaries and instructions.
 */

/**
 * Simplify a learning outcome / evidence criterion into a direct, second-person
 * or imperative wellness instruction.
 *
 * Strips third-person pedagogical framing like "The learner can", "Learners will",
 * "The user can", etc., and ensures proper casing.
 */
export function simplifyWellnessCriterion(criterion: string): string {
  if (!criterion) return '';
  let text = criterion.trim();

  // Strip third-person pedagogical prefixes
  text = text.replace(/^(?:the\s+)?learners?\s+(?:can|will|should|is\s+able\s+to)\s+/i, '');
  text = text.replace(/^(?:the\s+)?users?\s+(?:can|will|should|is\s+able\s+to)\s+/i, '');
  text = text.replace(/^(?:you\s+can\s+)/i, '');

  if (!text) return criterion;

  // Capitalize first character
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Clean and simplify an array of criteria strings.
 */
export function simplifyWellnessCriteria(criteria: string[]): string[] {
  if (!Array.isArray(criteria)) return [];
  return criteria
    .map(simplifyWellnessCriterion)
    .filter((c) => c.length > 0);
}
