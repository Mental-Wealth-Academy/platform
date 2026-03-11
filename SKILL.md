---
name: mental-wealth-academy-design-system
description: A futuristic SaaS dashboard for AI-driven education and community governance. Modular cards, clean typography, Web3-inspired identity, treasury, and voting systems. Product-led onboarding with gamified progress and credential-based access. Designed like Notion, Stripe, and Coinbase had a very opinionated child. Use this skill when building dashboards, admin interfaces, or any UI that needs Jony Ive-level precision—clean, modern, minimalist with taste. Every pixel matters.
---

# Mental Wealth Academy Design System

**Built by Mental Wealth Academy** — A research-driven AI learning platform focused on cyber-psychology, pragmatic governance systems, and blockchain technology. This design system powers our educational platform where knowledge flows freely, communities connect transparently, and learning transforms into empowerment.

---

## Our Design Philosophy

Mental Wealth Academy is a futuristic SaaS dashboard for AI-driven education and community governance. We build interfaces that feel like **Notion, Stripe, and Coinbase had a very opinionated child**: modular cards, clean typography, Web3-inspired identity elements, treasury management, voting systems, and product-led onboarding with gamified progress.

Our design is **educational, community-centered, transparent, accessible, empowering, collaborative, and forward-thinking**. We enforce Jony Ive-level precision with intentional personality—every interface is polished, and each is designed for its specific context.

### Brand Mythology

The flowing knowledge path symbolizes the **Mental Wealth Field**—an abstract educational fabric where ideas form, communities connect, and knowledge transforms into empowerment. This represents continuous learning, community collaboration, transparent governance, and the flow of accessible education that builds a better future for everyone.

---

## Design Direction (REQUIRED)

**Before writing any code, commit to this design direction.** Mental Wealth Academy has a specific aesthetic that blends sophistication, trust, and accessibility.

### Our Personality: Sophisticated Trust Meets Approachable Learning

We blend two design directions:

**Sophistication & Trust** — Cool tones, layered depth, Web3 gravitas. For products handling governance, treasury, voting, and blockchain integrations. Think Stripe, Mercury, Coinbase.

**Warmth & Approachability** — Generous spacing, soft shadows, friendly educational energy. For community forums, learning quests, workshops, and collaborative spaces. Think Notion, Coda.

This blend creates an interface that feels **trustworthy yet welcoming**, **technical yet accessible**, **futuristic yet human**.

---

## Color System

Our color palette is rooted in knowledge, community, and transparency:

### Core Colors

**Academy Blue** `#5168FF` — Primary actions, trust, knowledge
- Primary buttons, links, active states, navigation highlights
- Use: 60% of interactive elements

**Growth Green** `#62BE8F` — Secondary elements, progress, community
- Progress indicators, success states, community features, gamification
- Use: 30% of supporting elements

**Light Purple Background** `#F4F5FE` — Calm, clarity, learning space
- Page backgrounds, card containers, subtle gradients
- Use: Foundation for all learning environments

**Absolute Black** `#000000` — Text, precision, structure
- Headings, body text, UI elements requiring maximum clarity

**Light Gray** `#ECECEC` — Text on dark, balance, subtle elements
- Secondary text on dark backgrounds, muted UI elements

### Gradient: Futuristic Floss

```css
--gradient-futuristic-floss: linear-gradient(to bottom, #ECECFF, #E1E1FE);
```

Use for:
- Hero sections
- Card backgrounds for featured content
- Subtle overlays that add depth without overwhelming
- Knowledge flow animations

### Category Colors (Extended Palette)

**Mental Health** `#9B7ED9` — Cyber-psychology content
**Productivity** `#5168FF` — Efficiency, workshops, quests
**Wealth** `#62BE8F` — Treasury, blockchain, governance

### Color Usage Philosophy

**Gray builds structure. Color communicates meaning.** In our platform:
- **Academy Blue** signals trust, primary actions, navigation
- **Growth Green** signals progress, achievements, community growth
- **Purple backgrounds** create calm learning environments
- **Category colors** only appear when categorizing content

Decorative color is noise. Every color choice must earn its place.

---

## Typography System

Typography sets the tone for knowledge transfer and community trust.

### Font Families

**Space Grotesk** — Headlines, navigation, UI labels
- Geometric, modern, technical yet approachable
- Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Use for: H1-H6, page titles, section headers, navigation

**Poppins Light** — Body text, descriptions, long-form content
- Humanist, readable, warm, accessible
- Font weight: 300 (light) for body, 400-700 for emphasis
- Use for: Paragraphs, card descriptions, forum posts, workshop content

**IBM Plex Mono** — Buttons, code, blockchain references, technical data
- Monospace, structured, Web3-inspired
- Font weights: 400-700
- Use for: Buttons (uppercase), wallet addresses, smart contract data, treasury figures, IDs, timestamps

### Typography Scale (4px Grid)

```css
--text-xs: 11px;    /* Micro labels, timestamps */
--text-sm: 12px;    /* Captions, metadata */
--text-base: 14px;  /* Body text baseline */
--text-md: 16px;    /* Comfortable reading */
--text-lg: 18px;    /* Subheadings */
--text-xl: 24px;    /* Section headers */
--text-2xl: 32px;   /* Page titles */
--text-3xl: 48px;   /* Hero headlines */
```

### Typography Hierarchy

**Headlines (Space Grotesk)**
- 600-700 weight
- Tight letter-spacing (-0.02em)
- Use for structure and navigation

**Body (Poppins Light)**
- 300-400 weight
- Standard tracking (0em)
- Line height: 1.6 for readability

**Labels (Space Grotesk)**
- 500 weight
- Slight positive tracking for uppercase labels
- Use for navigation, categories, tags

**Monospace for Data (IBM Plex Mono)**
- Numbers, IDs, codes, timestamps, wallet addresses
- `font-variant-numeric: tabular-nums` for columnar alignment
- Mono signals "this is technical data"

---

## Spacing & Layout

### The 4px Grid

All spacing uses a 4px base grid for precision and rhythm:

```css
--space-1: 4px;    /* Micro spacing (icon gaps) */
--space-2: 8px;    /* Tight spacing (within components) */
--space-3: 12px;   /* Standard spacing (between related elements) */
--space-4: 16px;   /* Comfortable spacing (section padding) */
--space-5: 24px;   /* Generous spacing (between sections) */
--space-6: 32px;   /* Major separation */
--space-7: 48px;   /* Large section breaks */
--space-8: 64px;   /* Hero spacing */
```

### Symmetrical Padding

**TLBR must match.** If top padding is 16px, left/bottom/right must also be 16px.

```css
/* Good */
padding: 16px;
padding: 12px 16px; /* Only when horizontal needs more room */

/* Bad */
padding: 24px 16px 12px 16px;
```

Exception: when content naturally creates visual balance (e.g., optical centering).

### Layout Approach

Mental Wealth Academy uses **modular card layouts** with **sidebar navigation** for multi-section apps:

**Sidebar Navigation** — Persistent left sidebar for Workshops, Library, Forum, Quests, Voting, Treasury
**Modular Cards** — Each feature (workshop, quest, proposal) lives in its own card container
**Dense Grids** — For library resources, forum posts, and governance proposals where users scan and compare
**Generous Spacing** — For focused learning experiences like workshop content and quest interactions

---

## Card System

### Card Layouts Vary, Surface Treatment Stays Consistent

A workshop card doesn't look like a treasury card doesn't look like a voting proposal card. Design each card's internal structure for its specific content—but keep the surface treatment consistent.

### Card Surface Treatment

```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(81, 104, 255, 0.08);
  padding: 16px;
  transition: all 250ms cubic-bezier(0.25, 1, 0.5, 1);
}

.card:hover {
  box-shadow: 0 8px 24px rgba(81, 104, 255, 0.15);
  transform: translateY(-2px);
}
```

### Card Categories with Border Accents

```css
.card-mental-health {
  border-left: 4px solid #9B7ED9;
}

.card-productivity {
  border-left: 4px solid #5168FF;
}

.card-wealth {
  border-left: 4px solid #62BE8F;
}
```

### Example Card Types

**Workshop Card** — Title, category badge, progress bar, avatar stack of participants, "Continue" button

**Quest Card** — Quest name, XP reward chip, progress ring, difficulty indicator, completion status

**Proposal Card** — Proposal title, voting deadline countdown (monospace), vote distribution bar, "Vote" button, treasury impact indicator

**Treasury Card** — Balance (large monospace), 7-day sparkline, transaction count, "View Transactions" link

Each card type has a unique internal layout but shares the same border radius, shadow depth, padding scale, and typography system.

---

## Depth & Elevation Strategy

Mental Wealth Academy uses **subtle single shadows with border reinforcement**.

### Our Approach: Soft Lift + Borders

We combine:
- **Subtle borders** (`0.5px solid rgba(0, 0, 0, 0.08)`) for definition
- **Single soft shadows** for gentle elevation
- **Background color shifts** for hierarchy

This creates a **clean, technical, trustworthy** feel appropriate for Web3 governance while maintaining **approachability** for educational content.

```css
/* Card elevation */
--shadow-card: 0 4px 16px rgba(81, 104, 255, 0.08);
--shadow-card-hover: 0 8px 24px rgba(81, 104, 255, 0.15);

/* Subtle borders */
--border: rgba(0, 0, 0, 0.08);
--border-subtle: rgba(0, 0, 0, 0.05);
```

**The craft is in the choice, not the complexity.** A flat interface with perfect spacing and typography is more polished than a shadow-heavy interface with sloppy details.

---

## Border Radius

Stick to the 4px grid. We use **soft corners** to balance technical precision with approachability:

```css
--radius-sm: 4px;    /* Tags, badges, small chips */
--radius-md: 8px;    /* Buttons, inputs, small cards */
--radius-lg: 12px;   /* Standard cards, modals */
--radius-xl: 16px;   /* Hero cards, featured content */
--radius-full: 9999px; /* Pills, avatars, status indicators */
```

**System: 4px, 8px, 12px, 16px, full**

Don't mix systems. Consistency creates coherence.

---

## Isolated Controls

UI controls deserve container treatment. Date pickers, filters, dropdowns—these should feel like **crafted Web3 objects** sitting on the page.

### Custom Components Required

**Never use native form elements for styled UI.** Native `<select>`, `<input type="date">` render OS-native elements that cannot be styled.

Build custom:
- **Custom select**: Trigger button + positioned dropdown menu (use `display: inline-flex` with `white-space: nowrap`)
- **Custom date picker**: Input + calendar popover
- **Custom checkbox/radio**: Styled div with state management
- **Custom wallet connect button**: Web3 modal trigger with connection status

---

## Iconography

Use **Phosphor Icons** (`@phosphor-icons/react`).

Icons clarify, not decorate. If removing an icon loses no meaning, remove it.

### Icon Containers

Give standalone icons presence with subtle background containers:

```css
.icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(81, 104, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

Use for:
- Feature cards (workshop icon, quest icon, voting icon)
- Navigation sidebar icons
- Status indicators

---

## Animation & Motion

### Timing & Easing

```css
--duration-fast: 150ms;     /* Micro-interactions (hover, focus) */
--duration-normal: 250ms;   /* Standard transitions (cards, dropdowns) */
--duration-slow: 400ms;     /* Large state changes (modals, sidebars) */
--duration-swipe: 300ms;    /* Swipe card gamification */

--ease-out: cubic-bezier(0.25, 1, 0.5, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

**No spring/bouncy effects in enterprise UI.** Our animations are smooth, decisive, and respectful of user focus.

### Gamification Animations

For quests and progress indicators:
- Progress bars fill smoothly over 400ms
- XP chips scale in with subtle pop
- Quest completion triggers confetti (but tasteful, minimal)
- Level-up badges fade in with gentle glow

---

## Mobile-First Page Architecture (REQUIRED)

Every page MUST follow this Duolingo-inspired, mobile-first information architecture. The `/community` page is the gold standard — study it before building any new page.

### Pod Grid Navigation Pattern

Instead of long vertical scrolls, organize page content into **tappable pod cards** that switch tab content below. This is the core UX pattern for MWA.

```
┌─────────────────────────────────────┐
│  Greeting / Context Header          │
│  (label + title, optional calendar) │
├─────────────────────────────────────┤
│  Stats / Progress Row (optional)    │
├───────────┬───────────┬─────────────┤
│  Pod 1    │  Pod 2    │  Pod 3      │  ← tappable, active = blue
│  (icon)   │  (icon)   │  (icon)     │
│  Title    │  Title    │  Title      │
│  Desc     │  Desc     │  Desc       │
├───────────┴───────────┴─────────────┤
│  Tab Content (switches per pod)     │
│  Single-purpose, focused content    │
└─────────────────────────────────────┘
```

**Rules:**
- Max 3 pods per page (cognitive load)
- Active pod: `background: var(--color-primary)`, white text, 5px bottom border
- Inactive pod: white background, dark text, 3px border
- On mobile (≤480px): pods stack vertically as horizontal row cards (icon left, text right)
- Pod grid uses `grid-template-columns: repeat(3, 1fr)` with 12px gap
- Tab content animates in with `fadeIn 0.25s ease`
- Each pod card has brutalist shadow: `4px 4px 0 #1A1D33`, hover lifts to `6px 6px 0`

### Content Density

- **Above the fold:** Greeting, progress indicator, pod grid — everything needed to navigate
- **Below the fold:** Tab content for the selected pod only (not all content at once)
- **No infinite scroll pages** — if content is long (e.g., 12 journal weeks), put it behind a pod tab
- **Max content width:** 900px for focused pages, 1180px for data-heavy pages

### Mobile Breakpoints

```css
/* Small mobile (≤480px): pods stack vertically, compact padding */
/* Tablet (≤900px): sidebar collapses, top bar navigation */
/* Desktop (≥1024px): sidebar visible, generous spacing */
```

### What Makes a Great MWA Page

1. **Instant clarity** — User knows where they are and what to do within 2 seconds
2. **Pod navigation** — 3 tappable cards organize all features without scrolling
3. **Stats at a glance** — Key progress/metrics visible before any interaction
4. **Single CTA per view** — Each tab has one primary action
5. **Brutalist visual identity** — Bold borders, offset shadows, uppercase labels
6. **Sound feedback** — `play('click')` on pod tap, `play('hover')` on hover

---

## Navigation Context

Screens need grounding. A voting proposal floating in space feels like a component demo, not a platform.

### Mental Wealth Academy Navigation Structure

**Persistent Sidebar** (same background as main content, separated by subtle border):
- Mental Wealth Academy logo (top)
- Home, Community, Rankings, PvP Arena, Shop, Research, Treasury

**Top Bar (mobile)**:
- Replaces sidebar on ≤900px
- Logo + hamburger menu

**Location Indicators**:
- Active nav state (Academy Blue with subtle background)
- Breadcrumbs for nested sections
- Page title (Space Grotesk, 22-24px, bold)

---

## Contrast Hierarchy

Build a four-level system:

```css
--text-foreground: rgba(0, 0, 0, 1.0);    /* Primary text */
--text-secondary: rgba(0, 0, 0, 0.7);     /* Secondary text */
--text-muted: rgba(0, 0, 0, 0.5);         /* Muted text, placeholders */
--text-faint: rgba(0, 0, 0, 0.3);         /* Borders, dividers */
```

Use all four consistently. This creates clear visual hierarchy without relying on color.

---

## Product-Led Onboarding

Mental Wealth Academy uses **credential-based access** with **gamified progress**.

### Onboarding Flow

1. **Wallet Connection** — Web3 authentication, credential verification
2. **Profile Completion** — Avatar, interests, learning goals (progress bar shows completion %)
3. **First Quest** — Guided tutorial as an interactive quest with XP rewards
4. **Community Introduction** — Forum welcome post, workshop recommendations
5. **Treasury Participation** — First governance vote (small stakes, educational)

### Progress Indicators

- **Profile Completion Ring** — Circular progress (0-100%) with percentage in center (monospace)
- **Quest Progress Bars** — Horizontal bars with checkpoints
- **Level System** — XP accumulation with level badges (gamification)
- **Credential Badges** — Unlocked achievements displayed on profile

---

## Web3 & Blockchain UI Patterns

### Wallet Addresses

Always use monospace (IBM Plex Mono) with truncation:

```
0x1234...5678
```

Include copy button with hover state.

### Transaction Status

Use color for meaning:
- **Pending** — Academy Blue with loading animation
- **Confirmed** — Growth Green with checkmark
- **Failed** — Red with warning icon

### Treasury Displays

```css
.treasury-balance {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 48px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

Pair with 7-day sparkline (subtle, muted color) and transaction count.

### Voting Interfaces

- **Voting bars** — Horizontal bars showing vote distribution (Yes/No/Abstain)
- **Countdown timers** — Monospace, clear hierarchy
- **Quorum indicators** — Progress ring showing % of votes needed
- **Delegation status** — Badge showing if user has delegated voting power

---

## Dark Mode Considerations

Mental Wealth Academy supports dark mode for focus and premium feel.

### Dark Mode Adjustments

**Borders over shadows** — Borders at 10-15% white opacity
**Desaturated semantic colors** — Slightly muted blues and greens
**Same structure, inverted values** — Hierarchy system still applies

```css
/* Dark mode variables */
--color-background-dark: #0A0A0F;
--color-card-dark: #151520;
--text-foreground-dark: rgba(255, 255, 255, 0.95);
--text-secondary-dark: rgba(255, 255, 255, 0.65);
```

---

## Anti-Patterns

### Never Do This

- Dramatic drop shadows (`box-shadow: 0 25px 50px...`)
- Large border radius (16px+) on small elements like buttons
- Asymmetric padding without clear reason
- Pure white cards on colored backgrounds
- Excessive spacing (margins > 48px between sections)
- Spring/bouncy animations (this isn't iOS)
- Gradients for decoration (only Futuristic Floss gradient, intentionally)
- Multiple accent colors in one interface (Academy Blue is primary, Growth Green is secondary—that's it)
- Mixing native form elements with custom UI
- **Long vertical scrolls** — use pod grid tabs to organize content into focused sections
- **Showing everything at once** — hide complexity behind tabs, reveal on interaction
- **Decorative hero elements** that don't communicate value (e.g., animated GIFs with no purpose)
- **Desktop-first layouts** — always start with mobile (≤480px), scale up

### Always Question

- "Does this design direction fit Mental Wealth Academy's mission?"
- "Does this element communicate knowledge, community, or transparency?"
- "Is my depth strategy consistent and intentional?"
- "Are all elements on the 4px grid?"
- "Does this color choice earn its place, or is it decorative noise?"
- "Would this feel appropriate in a Web3 governance interface?"
- "Does this feel educational and empowering, not intimidating?"

---

## The Standard

Every interface should look designed by a team that obsesses over 1-pixel differences. Not stripped—**crafted**. And designed for Mental Wealth Academy's specific context.

Mental Wealth Academy is a **sophisticated, trustworthy, approachable, educational platform** where communities learn, govern, and grow together. Our design reflects:

- **Knowledge flow** — Clear hierarchy, readable typography, accessible information
- **Community connection** — Warm colors, generous spacing, collaborative features
- **Transparent governance** — Web3 patterns, monospace data, clear voting interfaces
- **Empowerment** — Gamification, progress indicators, achievement systems

### Voice & Personality

**Clear, supportive, inclusive, confident, inspiring.**

Sample copy:
- "Knowledge for all, together."
- "Building transparent futures."
- "Education that empowers communities."
- "Grow stronger by empowering your community."

---

## Core Craft Principles

These apply to every screen, every component, every interaction:

1. **Precision** — Every spacing value on the 4px grid
2. **Consistency** — Same surface treatment across all cards
3. **Hierarchy** — Four-level contrast system always applied
4. **Meaning** — Color only appears when it communicates
5. **Accessibility** — Readable typography, clear labels, semantic HTML
6. **Context** — Every design decision serves Mental Wealth Academy's mission

---

The goal: **intricate minimalism with appropriate personality**. Same quality bar, context-driven execution. Built for communities, powered by knowledge, governed transparently.

**This is Mental Wealth Academy.**
