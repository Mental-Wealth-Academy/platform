'use client';

import React from 'react';
import styles from './page.module.css';
import {
  colors,
  gradients,
  fontFamilies,
  fontSizes,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  durations,
  easings,
  zIndex,
} from '@/styles/design-tokens';

// Import actual components from codebase
import Banner from '@/components/banner/Banner';
import BookCard from '@/components/book-card/BookCard';
import EventCard from '@/components/event-card/EventCard';
import { HelpTooltip } from '@/components/help-tooltip/HelpTooltip';
import NewsletterCard from '@/components/newsletter-card/NewsletterCard';
import LibraryCard from '@/components/library-card/LibraryCard';
import { SoulGemDisplay } from '@/components/soul-gems/SoulGemDisplay';
import ProposalStages from '@/components/proposal-stages/ProposalStages';

/**
 * Mental Wealth Academy Style Guide
 * Visual reference for all design tokens
 */
export default function StyleGuidePage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>Design System</h1>
          <p className={styles.subtitle}>
            Mental Wealth Academy — Visual reference for design tokens and components
          </p>
        </header>

        {/* Colors Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🎨 Colors</h2>
          <p className={styles.sectionDescription}>
            Our color palette is rooted in knowledge, community, and transparency. 
            Academy Blue signals trust and primary actions, while Growth Green signals progress and achievements.
          </p>

          {/* Primary Colors */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Primary Colors</h3>
            <div className={styles.colorGrid}>
              <ColorCard name="Primary" value={colors.primary.DEFAULT} />
              <ColorCard name="Primary Hover" value={colors.primary.hover} />
              <ColorCard name="Primary Light" value={colors.primary.light} />
              <ColorCard name="Secondary" value={colors.secondary.DEFAULT} />
              <ColorCard name="Secondary Hover" value={colors.secondary.hover} />
              <ColorCard name="Secondary Light" value={colors.secondary.light} />
            </div>
          </div>

          {/* Background Colors */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Background Colors</h3>
            <div className={styles.colorGrid}>
              <ColorCard name="Background" value={colors.background.DEFAULT} />
              <ColorCard name="Card" value="#FFFFFF" />
              <ColorCard name="Dark Background" value={colors.background.dark} />
              <ColorCard name="Dark Card" value={colors.background.cardDark} />
            </div>
          </div>

          {/* Neutral Colors */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Neutral Scale</h3>
            <div className={styles.colorGrid}>
              <ColorCard name="White" value={colors.neutrals.white} />
              <ColorCard name="Gray 50" value={colors.neutrals[50]} />
              <ColorCard name="Gray 100" value={colors.neutrals[100]} />
              <ColorCard name="Gray 200" value={colors.neutrals[200]} />
              <ColorCard name="Gray 300" value={colors.neutrals[300]} />
              <ColorCard name="Gray 400" value={colors.neutrals[400]} />
              <ColorCard name="Gray 500" value={colors.neutrals[500]} />
              <ColorCard name="Gray 600" value={colors.neutrals[600]} />
              <ColorCard name="Gray 700" value={colors.neutrals[700]} />
              <ColorCard name="Gray 800" value={colors.neutrals[800]} />
              <ColorCard name="Gray 900" value={colors.neutrals[900]} />
              <ColorCard name="Black" value={colors.neutrals.black} />
            </div>
          </div>

          {/* Semantic Colors */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Semantic Colors</h3>
            <div className={styles.colorGrid}>
              <ColorCard name="Success" value={colors.semantic.success.DEFAULT} />
              <ColorCard name="Success Light" value={colors.semantic.success.light} />
              <ColorCard name="Warning" value={colors.semantic.warning.DEFAULT} />
              <ColorCard name="Warning Light" value={colors.semantic.warning.light} />
              <ColorCard name="Error" value={colors.semantic.error.DEFAULT} />
              <ColorCard name="Error Light" value={colors.semantic.error.light} />
              <ColorCard name="Info" value={colors.semantic.info.DEFAULT} />
              <ColorCard name="Info Light" value={colors.semantic.info.light} />
            </div>
          </div>

          {/* Category Colors */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Category Colors</h3>
            <div className={styles.colorGrid}>
              <ColorCard name="Mental Health" value={colors.category.mentalHealth} />
              <ColorCard name="Productivity" value={colors.category.productivity} />
              <ColorCard name="Wealth" value={colors.category.wealth} />
            </div>
          </div>
        </section>

        {/* Gradients Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🌈 Gradients</h2>
          <p className={styles.sectionDescription}>
            Subtle gradients for hero sections, featured content, and depth effects.
          </p>
          <div className={styles.gradientGrid}>
            <GradientCard 
              name="Futuristic Floss" 
              value={gradients.futuristicFloss}
              description="Hero sections, featured content"
            />
            <GradientCard 
              name="Primary Gradient" 
              value={gradients.primary}
              description="Primary action emphasis"
            />
            <GradientCard 
              name="Secondary Gradient" 
              value={gradients.secondary}
              description="Progress and achievement"
            />
            <GradientCard 
              name="Swipe Like" 
              value={gradients.swipeLike}
              description="Positive swipe actions"
            />
            <GradientCard 
              name="Swipe Skip" 
              value={gradients.swipeSkip}
              description="Negative swipe actions"
            />
            <GradientCard 
              name="Swipe Save" 
              value={gradients.swipeSave}
              description="Save/bookmark actions"
            />
          </div>
        </section>

        {/* Typography Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>✏️ Typography</h2>
          <p className={styles.sectionDescription}>
            Typography sets the tone for knowledge transfer and community trust.
            Space Grotesk for headlines, Poppins for body text, IBM Plex Mono for buttons and technical data.
          </p>

          {/* Font Families */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Font Families</h3>
            <div className={styles.fontFamilyGrid}>
              <div className={styles.fontFamilyCard}>
                <div className={styles.fontFamilyName} style={{ fontFamily: fontFamilies.primary }}>
                  Poppins
                </div>
                <div className={styles.fontFamilyUsage}>Primary — Body Text</div>
                <div className={styles.fontFamilySample} style={{ fontFamily: fontFamilies.primary, fontWeight: 300 }}>
                  The quick brown fox jumps over the lazy dog.
                </div>
                <div className={styles.fontWeightsRow}>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.primary, fontWeight: 300 }}>Light 300</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.primary, fontWeight: 400 }}>Regular 400</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.primary, fontWeight: 500 }}>Medium 500</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.primary, fontWeight: 600 }}>Semibold 600</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.primary, fontWeight: 700 }}>Bold 700</span>
                </div>
              </div>
              <div className={styles.fontFamilyCard}>
                <div className={styles.fontFamilyName} style={{ fontFamily: fontFamilies.secondary }}>
                  Space Grotesk
                </div>
                <div className={styles.fontFamilyUsage}>Secondary — Headlines, Navigation</div>
                <div className={styles.fontFamilySample} style={{ fontFamily: fontFamilies.secondary }}>
                  The quick brown fox jumps over the lazy dog.
                </div>
                <div className={styles.fontWeightsRow}>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.secondary, fontWeight: 400 }}>Regular 400</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.secondary, fontWeight: 500 }}>Medium 500</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.secondary, fontWeight: 600 }}>Semibold 600</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.secondary, fontWeight: 700 }}>Bold 700</span>
                </div>
              </div>
              <div className={styles.fontFamilyCard}>
                <div className={styles.fontFamilyName} style={{ fontFamily: fontFamilies.mono }}>
                  IBM Plex Mono
                </div>
                <div className={styles.fontFamilyUsage}>Mono — Buttons, Code, Technical Data</div>
                <div className={styles.fontFamilySample} style={{ fontFamily: fontFamilies.mono }}>
                  0x1234...5678 | $42,069.00
                </div>
                <div className={styles.fontWeightsRow}>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.mono, fontWeight: 400 }}>Regular 400</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.mono, fontWeight: 500 }}>Medium 500</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.mono, fontWeight: 600 }}>Semibold 600</span>
                  <span className={styles.fontWeightChip} style={{ fontFamily: fontFamilies.mono, fontWeight: 700 }}>Bold 700</span>
                </div>
              </div>
            </div>
          </div>

          {/* Type Scale */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Type Scale</h3>
            <div className={styles.typographyGrid}>
              <TypographySample 
                label="H1 — Hero Headlines" 
                text="Mental Wealth Academy" 
                style={{ ...typography.h1, fontSize: fontSizes['3xl'] }}
                meta={`${fontSizes['3xl']} / Bold / Space Grotesk`}
              />
              <TypographySample 
                label="H2 — Page Titles" 
                text="Building Transparent Futures" 
                style={{ ...typography.h2, fontSize: fontSizes['2xl'] }}
                meta={`${fontSizes['2xl']} / Semibold / Space Grotesk`}
              />
              <TypographySample 
                label="H3 — Section Headers" 
                text="Education That Empowers" 
                style={{ ...typography.h3, fontSize: fontSizes.xl }}
                meta={`${fontSizes.xl} / Semibold / Space Grotesk`}
              />
              <TypographySample 
                label="H4 — Subheadings" 
                text="Community Governance" 
                style={{ ...typography.h4, fontSize: fontSizes.lg }}
                meta={`${fontSizes.lg} / Semibold / Space Grotesk`}
              />
              <TypographySample 
                label="Body — Primary Text" 
                text="Our design is educational, community-centered, transparent, accessible, empowering, collaborative, and forward-thinking." 
                style={{ ...typography.body, fontSize: fontSizes.base }}
                meta={`${fontSizes.base} / Light / Poppins`}
              />
              <TypographySample 
                label="Body Large — Featured Text" 
                text="Knowledge for all, together. Growing stronger by empowering your community." 
                style={{ ...typography.bodyLarge, fontSize: fontSizes.md }}
                meta={`${fontSizes.md} / Light / Poppins`}
              />
              <TypographySample 
                label="Caption — Metadata" 
                text="Last updated 2 hours ago • 1.2k views • 48 comments" 
                style={{ ...typography.caption, fontSize: fontSizes.xs }}
                meta={`${fontSizes.xs} / Regular / Poppins`}
              />
              <TypographySample 
                label="Button — Actions" 
                text="CONNECT WALLET" 
                style={{ ...typography.button, fontSize: fontSizes.base }}
                meta={`${fontSizes.base} / Medium / IBM Plex Mono / Uppercase`}
              />
              <TypographySample 
                label="Mono — Technical Data" 
                text="0x1234...5678 | Block #18,942,156" 
                style={{ ...typography.mono, fontSize: fontSizes.base }}
                meta={`${fontSizes.base} / Regular / IBM Plex Mono / Tabular Nums`}
              />
            </div>
          </div>
        </section>

        {/* Spacing Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📏 Spacing Scale</h2>
          <p className={styles.sectionDescription}>
            All spacing uses a 4px base grid for precision and rhythm. Compatible with Tailwind spacing utilities.
          </p>
          <div className={styles.spacingGrid}>
            {[
              { key: '1', value: spacing[1], px: '4px' },
              { key: '2', value: spacing[2], px: '8px' },
              { key: '3', value: spacing[3], px: '12px' },
              { key: '4', value: spacing[4], px: '16px' },
              { key: '5', value: spacing[5], px: '20px' },
              { key: '6', value: spacing[6], px: '24px' },
              { key: '8', value: spacing[8], px: '32px' },
              { key: '10', value: spacing[10], px: '40px' },
              { key: '12', value: spacing[12], px: '48px' },
              { key: '16', value: spacing[16], px: '64px' },
              { key: '20', value: spacing[20], px: '80px' },
              { key: '24', value: spacing[24], px: '96px' },
            ].map((s) => (
              <div key={s.key} className={styles.spacingRow}>
                <span className={styles.spacingLabel}>{s.key}</span>
                <div 
                  className={styles.spacingBar} 
                  style={{ width: `calc(${s.value} * 3)` }}
                >
                  <span className={styles.spacingValue}>{s.px}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Border Radius Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🔲 Border Radius</h2>
          <p className={styles.sectionDescription}>
            Soft corners to balance technical precision with approachability. Stick to the 4px grid.
          </p>
          <div className={styles.radiusGrid}>
            {Object.entries(borderRadius).map(([key, value]) => (
              <div key={key} className={styles.radiusCard} style={{ borderRadius: value }}>
                <div 
                  className={styles.radiusSample} 
                  style={{ borderRadius: value }}
                />
                <span className={styles.radiusLabel}>{key}</span>
                <span className={styles.radiusValue}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Shadows Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🌓 Shadows</h2>
          <p className={styles.sectionDescription}>
            Subtle single shadows with border reinforcement. The craft is in the choice, not the complexity.
          </p>
          <div className={styles.shadowGrid}>
            {[
              { name: 'None', value: shadows.none },
              { name: 'Small', value: shadows.sm },
              { name: 'Default', value: shadows.DEFAULT },
              { name: 'Medium', value: shadows.md },
              { name: 'Large', value: shadows.lg },
              { name: 'Extra Large', value: shadows.xl },
              { name: 'Primary', value: shadows.primary },
              { name: 'Card', value: shadows.card },
              { name: 'Card Hover', value: shadows.cardHover },
            ].map((shadow) => (
              <div 
                key={shadow.name} 
                className={styles.shadowCard}
                style={{ boxShadow: shadow.value }}
              >
                <span className={styles.shadowLabel}>{shadow.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Breakpoints Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📱 Breakpoints</h2>
          <p className={styles.sectionDescription}>
            Mobile-first responsive design breakpoints. Design for the smallest screen first.
          </p>
          <div className={styles.breakpointGrid}>
            {[
              { name: 'xs', value: breakpoints.xs, device: 'Small phones', percent: 20 },
              { name: 'sm', value: breakpoints.sm, device: 'Large phones', percent: 30 },
              { name: 'md', value: breakpoints.md, device: 'Tablets', percent: 50 },
              { name: 'lg', value: breakpoints.lg, device: 'Laptops', percent: 67 },
              { name: 'xl', value: breakpoints.xl, device: 'Desktops', percent: 83 },
              { name: '2xl', value: breakpoints['2xl'], device: 'Large desktops', percent: 100 },
            ].map((bp) => (
              <div key={bp.name} className={styles.breakpointRow}>
                <span className={styles.breakpointName}>{bp.name}</span>
                <span className={styles.breakpointValue}>{bp.value}</span>
                <div className={styles.breakpointBar}>
                  <div 
                    className={styles.breakpointFill}
                    style={{ width: `${bp.percent}%` }}
                  />
                </div>
                <span className={styles.breakpointDevice}>{bp.device}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Animation Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⚡ Animation</h2>
          <p className={styles.sectionDescription}>
            Smooth, decisive animations that respect user focus. No spring/bouncy effects in enterprise UI.
          </p>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Durations</h3>
            <div className={styles.animationGrid}>
              {Object.entries(durations).map(([key, value]) => (
                <div key={key} className={styles.animationCard}>
                  <div 
                    className={styles.animationBox}
                    style={{ transition: `transform ${value} ease` }}
                  />
                  <span className={styles.animationLabel}>{key}</span>
                  <span className={styles.animationValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Easing Curves</h3>
            <div className={styles.animationGrid}>
              {Object.entries(easings).map(([key, value]) => (
                <div key={key} className={styles.animationCard}>
                  <div 
                    className={styles.animationBox}
                    style={{ transition: `transform 300ms ${value}` }}
                  />
                  <span className={styles.animationLabel}>{key}</span>
                  <span className={styles.animationValue} style={{ fontSize: '0.5rem' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Z-Index Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📚 Z-Index Scale</h2>
          <p className={styles.sectionDescription}>
            Layering system for managing stacking contexts consistently across components.
          </p>
          <div className={styles.zIndexGrid}>
            {Object.entries(zIndex)
              .filter(([, value]) => typeof value === 'number')
              .sort(([, a], [, b]) => (a as number) - (b as number))
              .map(([key, value]) => (
                <div key={key} className={styles.zIndexRow}>
                  <span className={styles.zIndexLabel}>{key}</span>
                  <span className={styles.zIndexValue}>{value}</span>
                </div>
              ))}
          </div>
        </section>

        {/* Buttons Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🔘 Buttons</h2>
          <p className={styles.sectionDescription}>
            All buttons use IBM Plex Mono font with uppercase text and 0.05em letter-spacing.
          </p>
          <div className={styles.buttonGrid}>
            <button className={styles.buttonPrimary}>Primary Button</button>
            <button className={styles.buttonSecondary}>Secondary Button</button>
            <button className={styles.buttonOutline}>Outline Button</button>
            <button className={styles.buttonDark}>Dark Button</button>
          </div>
        </section>

        {/* Cards Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🃏 Cards</h2>
          <p className={styles.sectionDescription}>
            Card layouts vary, but surface treatment stays consistent. Each card type shares the same border radius, shadow depth, padding scale, and typography system.
          </p>
          <div className={styles.cardGrid}>
            <div className={`${styles.exampleCard} ${styles.cardMentalHealth}`}>
              <div className={styles.cardCategory} style={{ color: colors.category.mentalHealth }}>
                Mental Health
              </div>
              <div className={styles.cardTitle}>Cyber-Psychology Fundamentals</div>
              <div className={styles.cardDescription}>
                Understanding the psychological impact of digital environments on mental wellness.
              </div>
            </div>
            <div className={`${styles.exampleCard} ${styles.cardProductivity}`}>
              <div className={styles.cardCategory} style={{ color: colors.category.productivity }}>
                Productivity
              </div>
              <div className={styles.cardTitle}>Deep Work Workshop</div>
              <div className={styles.cardDescription}>
                Master the art of focused work in an age of constant distraction.
              </div>
            </div>
            <div className={`${styles.exampleCard} ${styles.cardWealth}`}>
              <div className={styles.cardCategory} style={{ color: colors.category.wealth }}>
                Wealth
              </div>
              <div className={styles.cardTitle}>Treasury Governance</div>
              <div className={styles.cardDescription}>
                Participate in community-driven financial decisions and proposals.
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            LIVE COMPONENTS SECTION
            ============================================ */}
        
        {/* Banner Component */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📢 Banner</h2>
          <p className={styles.sectionDescription}>
            Announcement banner for site-wide messages. Full-width with background image and centered text.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>Banner</div>
            <div className={styles.componentPreview}>
              <Banner />
            </div>
            <div className={styles.componentMeta}>
              <code>components/banner/Banner.tsx</code>
            </div>
          </div>
        </section>

        {/* Book Card Component */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📚 Book Card</h2>
          <p className={styles.sectionDescription}>
            Library book display card with cover image, title, author, description, and category badge.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>BookCard</div>
            <div className={styles.componentPreview} style={{ maxWidth: '400px' }}>
              <BookCard 
                title="Web3 Education"
                author="By: Jhinn Bay"
                description="Explore the transformative power of blockchain technology and its revolutionary capabilities in reshaping the digital landscape."
                category="Non-Fiction"
              />
            </div>
            <div className={styles.componentMeta}>
              <code>components/book-card/BookCard.tsx</code>
            </div>
          </div>
        </section>

        {/* Event Card Component */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📅 Event Card</h2>
          <p className={styles.sectionDescription}>
            Event listing card with image, title, badges, description, and action buttons.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>EventCard</div>
            <div className={styles.componentPreview} style={{ maxWidth: '400px' }}>
              <EventCard 
                heading="Community Workshop"
                badge1Text="Workshop"
                badge2Text="Jan 20, 2026"
                description="Join us for an interactive session on blockchain governance and community building."
                secondaryButtonText="Learn More"
              />
            </div>
            <div className={styles.componentMeta}>
              <code>components/event-card/EventCard.tsx</code>
            </div>
          </div>
        </section>

        {/* Library Card Component */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📖 Library Card</h2>
          <p className={styles.sectionDescription}>
            IPFS Library navigation card with badges and transmission indicator.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>LibraryCard</div>
            <div className={styles.componentPreview} style={{ maxWidth: '350px' }}>
              <LibraryCard />
            </div>
            <div className={styles.componentMeta}>
              <code>components/library-card/LibraryCard.tsx</code>
            </div>
          </div>
        </section>

        {/* Newsletter Card Component */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📧 Newsletter Card</h2>
          <p className={styles.sectionDescription}>
            Daemon newsletter subscription card with button link.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>NewsletterCard</div>
            <div className={styles.componentPreview} style={{ maxWidth: '300px' }}>
              <NewsletterCard />
            </div>
            <div className={styles.componentMeta}>
              <code>components/newsletter-card/NewsletterCard.tsx</code>
            </div>
          </div>
        </section>

        {/* Soul Gem Display Component */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>💎 Soul Gem Display</h2>
          <p className={styles.sectionDescription}>
            Token/currency display with animated gem icon. Used for voting power and governance tokens.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>SoulGemDisplay</div>
            <div className={styles.componentPreviewRow}>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Small Amount</span>
                <SoulGemDisplay amount="150" />
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Medium Amount</span>
                <SoulGemDisplay amount="2500" />
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Large Amount</span>
                <SoulGemDisplay amount="1250000" />
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>No Label</span>
                <SoulGemDisplay amount="500" showLabel={false} />
              </div>
            </div>
            <div className={styles.componentMeta}>
              <code>components/soul-gems/SoulGemDisplay.tsx</code>
            </div>
          </div>
        </section>

        {/* Help Tooltip Component */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>❓ Help Tooltip</h2>
          <p className={styles.sectionDescription}>
            Interactive help tooltip with click-to-toggle behavior. Position can be customized.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>HelpTooltip</div>
            <div className={styles.componentPreviewRow}>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Top Right (default)</span>
                <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                  <HelpTooltip 
                    content="This is helpful information that appears when you click the icon. It can contain detailed explanations." 
                    position="top-right"
                  />
                </div>
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Bottom Right</span>
                <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                  <HelpTooltip 
                    content="Tooltips can be positioned in different corners for optimal visibility." 
                    position="bottom-right"
                  />
                </div>
              </div>
            </div>
            <div className={styles.componentMeta}>
              <code>components/help-tooltip/HelpTooltip.tsx</code>
            </div>
          </div>
        </section>

        {/* Proposal Stages Component */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📊 Proposal Stages</h2>
          <p className={styles.sectionDescription}>
            Visual progress indicator for governance proposals showing Blue review, blockchain transaction, and voting stages.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>ProposalStages</div>
            <div className={styles.componentPreviewColumn}>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Waiting for Review</span>
                <ProposalStages stage1="waiting" stage2="waiting" stage3="waiting" />
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Analyzing</span>
                <ProposalStages stage1="analyzing" stage2="waiting" stage3="waiting" />
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Approved - Processing</span>
                <ProposalStages 
                  stage1="approved" 
                  stage2="processing" 
                  stage3="waiting" 
                  blueReasoning="This proposal aligns with community goals and has a clear implementation plan."
                  tokenAllocation={25}
                />
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Active Voting</span>
                <ProposalStages stage1="approved" stage2="success" stage3="active" />
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Completed</span>
                <ProposalStages stage1="approved" stage2="success" stage3="completed" />
              </div>
              <div className={styles.componentVariant}>
                <span className={styles.variantLabel}>Rejected</span>
                <ProposalStages 
                  stage1="rejected" 
                  stage2="waiting" 
                  stage3="waiting"
                  blueReasoning="This proposal does not meet the minimum requirements for community consideration."
                />
              </div>
            </div>
            <div className={styles.componentMeta}>
              <code>components/proposal-stages/ProposalStages.tsx</code>
            </div>
          </div>
        </section>

        {/* Vote Buttons Preview */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🗳️ Vote Buttons</h2>
          <p className={styles.sectionDescription}>
            Approve/Reject voting buttons with loading states. Connects to blockchain for on-chain voting.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>VoteButtons (Preview)</div>
            <div className={styles.componentPreviewRow}>
              <button className={styles.voteApprove}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Approve</span>
              </button>
              <button className={styles.voteReject}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Reject</span>
              </button>
            </div>
            <div className={styles.componentMeta}>
              <code>components/vote-buttons/VoteButtons.tsx</code>
            </div>
          </div>
        </section>

        {/* Status Badges */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🏷️ Status Badges</h2>
          <p className={styles.sectionDescription}>
            Status indicators used across proposals, quests, and transactions.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>Status Badges</div>
            <div className={styles.componentPreviewRow}>
              <span className={styles.badgePending}>
                <span className={styles.badgeDot} />
                Under Review
              </span>
              <span className={styles.badgeApproved}>
                <span className={styles.badgeDot} />
                Approved
              </span>
              <span className={styles.badgeRejected}>
                <span className={styles.badgeDot} />
                Rejected
              </span>
              <span className={styles.badgeActive}>
                <span className={styles.badgeDot} />
                Active
              </span>
              <span className={styles.badgeCompleted}>
                <span className={styles.badgeDot} />
                Completed
              </span>
            </div>
          </div>
        </section>

        {/* Input Fields */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📝 Input Fields</h2>
          <p className={styles.sectionDescription}>
            Form inputs with consistent styling, focus states, and validation.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>Inputs</div>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Text Input</label>
                <input 
                  type="text" 
                  className={styles.textInput} 
                  placeholder="Enter your username..."
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>With Value</label>
                <input 
                  type="text" 
                  className={styles.textInput} 
                  defaultValue="@mentalwealth"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Disabled</label>
                <input 
                  type="text" 
                  className={styles.textInput} 
                  placeholder="Disabled input"
                  disabled
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Textarea</label>
                <textarea 
                  className={styles.textArea} 
                  placeholder="Write your proposal description..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Icons Reference */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🎯 Icon System</h2>
          <p className={styles.sectionDescription}>
            We use inline SVGs for icons to maintain consistency and enable color theming. Icons should be 16-24px.
          </p>
          <div className={styles.componentShowcase}>
            <div className={styles.componentLabel}>Common Icons</div>
            <div className={styles.iconGrid}>
              <div className={styles.iconItem}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Check</span>
              </div>
              <div className={styles.iconItem}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Close</span>
              </div>
              <div className={styles.iconItem}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Arrow Right</span>
              </div>
              <div className={styles.iconItem}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Info</span>
              </div>
              <div className={styles.iconItem}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor"/>
                </svg>
                <span>Star</span>
              </div>
              <div className={styles.iconItem}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>Grid</span>
              </div>
              <div className={styles.iconItem}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>User</span>
              </div>
              <div className={styles.iconItem}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.8273 3 17.35 4.30367 19 6.34267M21 3V9M21 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Refresh</span>
              </div>
            </div>
          </div>
        </section>

        {/* Component Index */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📦 Component Index</h2>
          <p className={styles.sectionDescription}>
            Complete list of all components available in the codebase.
          </p>
          <div className={styles.componentIndex}>
            <ComponentIndexItem 
              name="Banner" 
              path="components/banner" 
              description="Site-wide announcement banner"
            />
            <ComponentIndexItem 
              name="BookCard" 
              path="components/book-card" 
              description="Library book display card"
            />
            <ComponentIndexItem 
              name="EventCard" 
              path="components/event-card" 
              description="Event listing with registration"
            />
            <ComponentIndexItem 
              name="LibraryCard" 
              path="components/library-card" 
              description="IPFS library navigation card"
            />
            <ComponentIndexItem 
              name="NewsletterCard" 
              path="components/newsletter-card" 
              description="Newsletter subscription card"
            />
            <ComponentIndexItem 
              name="ProposalCard" 
              path="components/proposal-card" 
              description="Governance proposal display"
            />
            <ComponentIndexItem 
              name="ProposalStages" 
              path="components/proposal-stages" 
              description="Proposal progress indicator"
            />
            <ComponentIndexItem 
              name="VoteButtons" 
              path="components/vote-buttons" 
              description="Approve/Reject voting UI"
            />
            <ComponentIndexItem 
              name="SoulGemDisplay" 
              path="components/soul-gems" 
              description="Token/voting power display"
            />
            <ComponentIndexItem 
              name="TreasuryDisplay" 
              path="components/treasury-display" 
              description="Treasury balance widget"
            />
            <ComponentIndexItem 
              name="HelpTooltip" 
              path="components/help-tooltip" 
              description="Contextual help tooltip"
            />
            <ComponentIndexItem 
              name="ImpactSnapshot" 
              path="components/impact-snapshot" 
              description="User impact metrics display"
            />
            <ComponentIndexItem 
              name="ShardAnimation" 
              path="components/quests" 
              description="Gamification shard reward animation"
            />
            <ComponentIndexItem 
              name="Navbar" 
              path="components/navbar" 
              description="Main navigation bar"
            />
            <ComponentIndexItem 
              name="Footer" 
              path="components/footer" 
              description="Site footer"
            />
            <ComponentIndexItem 
              name="Hero" 
              path="components/hero" 
              description="Hero section for landing pages"
            />
            <ComponentIndexItem 
              name="BlueDialogue" 
              path="components/blue-dialogue" 
              description="AI assistant dialogue interface"
            />
            <ComponentIndexItem 
              name="OnboardingTour" 
              path="components/onboarding-tour" 
              description="Interactive onboarding walkthrough"
            />
            <ComponentIndexItem 
              name="SearchModal" 
              path="components/search-modal" 
              description="Global search modal"
            />
            <ComponentIndexItem 
              name="AvatarSelectorModal" 
              path="components/avatar-selector" 
              description="Avatar selection modal"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function ColorCard({ name, value }: { name: string; value: string }) {
  const isLight = isLightColor(value);
  
  return (
    <div className={styles.colorCard}>
      <div 
        className={styles.colorSwatch} 
        style={{ 
          backgroundColor: value,
          border: isLight ? '1px solid rgba(0,0,0,0.08)' : 'none'
        }} 
      />
      <div className={styles.colorInfo}>
        <div className={styles.colorName}>{name}</div>
        <div className={styles.colorValue}>{value}</div>
      </div>
    </div>
  );
}

function GradientCard({ name, value, description }: { name: string; value: string; description: string }) {
  return (
    <div className={styles.gradientCard}>
      <div 
        className={styles.gradientSwatch} 
        style={{ background: value }} 
      />
      <div className={styles.gradientInfo}>
        <div className={styles.gradientName}>{name}</div>
        <div className={styles.gradientValue}>{description}</div>
      </div>
    </div>
  );
}

function TypographySample({ 
  label, 
  text, 
  style, 
  meta 
}: { 
  label: string; 
  text: string; 
  style: React.CSSProperties; 
  meta: string;
}) {
  return (
    <div className={styles.typographySample}>
      <div className={styles.typographyLabel}>{label}</div>
      <div className={styles.typographyText} style={style}>{text}</div>
      <div className={styles.typographyMeta}>{meta}</div>
    </div>
  );
}

function ComponentIndexItem({ name, path, description }: { name: string; path: string; description: string }) {
  return (
    <div className={styles.indexItem}>
      <div className={styles.indexItemName}>{name}</div>
      <div className={styles.indexItemPath}><code>{path}</code></div>
      <div className={styles.indexItemDescription}>{description}</div>
    </div>
  );
}

// Helper function to determine if a color is light
function isLightColor(color: string): boolean {
  // Handle rgba colors
  if (color.startsWith('rgba')) return true;
  
  // Handle hex colors
  const hex = color.replace('#', '');
  if (hex.length !== 6) return false;
  
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.7;
}
