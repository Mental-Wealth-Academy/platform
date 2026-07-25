/**
 * Diamond prices for shop items, shared by the client (display + burn amount)
 * and the server (authoritative price for burn verification). The server never
 * trusts a client-supplied amount — it looks the price up here by item id.
 *
 * Diamonds are the fun, spendable currency: prices are set to feel affordable
 * to an engaged learner, not punishing. Paying with diamonds is a real burn
 * (a token sink), so it is offered as an alternative to the USDC price.
 */
export const SHOP_DIAMOND_PRICES: Record<string, number> = {
  shirt: 650,
  journal: 700,
  hoodie: 1300,
  'pin-set': 450,
  lanyard: 200,
  notebook: 250,
  'fountain-pen': 550,
  'scholar-slate': 2900,
  'study-lamp': 1050,
  'scholar-satchel': 1100,
  'chronos-timer': 380,
  'academic-textbook': 850,
  'brass-scale': 340,
  'desk-mat': 480,
  'card-vault': 620,
  'commencement-stole': 750,
};

export function getDiamondPrice(itemId: string): number | null {
  return SHOP_DIAMOND_PRICES[itemId] ?? null;
}
