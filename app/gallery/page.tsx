'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface Painting {
  title: string;
  artist: string;
  image: string;
  era: string;
  year: string;
  desc: string;
  size: 'hero' | 'large' | 'medium' | 'small' | 'wide';
}

const paintings: Painting[] = [
  { title: 'The Starry Night', artist: 'Vincent van Gogh', year: '1889', era: 'Post-Impressionism', size: 'hero', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', desc: 'Painted from memory during his stay at the asylum of Saint-Paul-de-Mausole, this iconic depiction of a swirling night sky over a quiet village is among the most recognized works in Western art.' },
  { title: 'Girl with a Pearl Earring', artist: 'Johannes Vermeer', year: '1665', era: 'Dutch Golden Age', size: 'large', image: 'https://mdl.artvee.com/sftb/201793fg.jpg', desc: 'Often called the "Mona Lisa of the North," this tronie depicts an imaginary girl in exotic dress with a remarkably large pearl earring.' },
  { title: 'The Great Wave off Kanagawa', artist: 'Katsushika Hokusai', year: '1831', era: 'Ukiyo-e', size: 'medium', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg', desc: 'A woodblock print depicting a massive wave threatening boats off the coast, with Mount Fuji in the background. One of the most recognized works of Japanese art.' },
  { title: 'The Kiss', artist: 'Gustav Klimt', year: '1908', era: 'Art Nouveau', size: 'medium', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg/800px-The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg', desc: 'A shimmering golden masterwork showing two lovers entwined in ornamental robes, epitomizing Klimt\'s "Golden Phase" of radical beauty.' },
  { title: 'Mona Lisa', artist: 'Leonardo da Vinci', year: '1503', era: 'Renaissance', size: 'small', image: 'https://mdl.artvee.com/sftb/254266fg.jpg', desc: 'The world\'s most famous portrait, celebrated for its subject\'s enigmatic expression, da Vinci\'s pioneering sfumato technique, and the atmospheric depth of its landscape.' },
  { title: 'The Scream', artist: 'Edvard Munch', year: '1893', era: 'Expressionism', size: 'small', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg', desc: 'An icon of existential dread, the agonized figure under a tumultuous orange sky has become one of the most recognizable images in art history.' },
  { title: 'The Birth of Venus', artist: 'Sandro Botticelli', year: '1485', era: 'Renaissance', size: 'wide', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1280px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg', desc: 'The goddess Venus emerges from the sea as a fully grown woman, arriving at the shore on a giant scallop shell — a masterpiece of Early Renaissance beauty.' },
  { title: 'Water Lilies', artist: 'Claude Monet', year: '1906', era: 'Impressionism', size: 'wide', image: 'https://mdl.artvee.com/sftb/544711ld.jpg', desc: 'Part of Monet\'s famous series of approximately 250 oil paintings depicting his flower garden at Giverny, capturing the magical play of light on water.' },
  { title: 'Guernica', artist: 'Pablo Picasso', year: '1937', era: 'Cubism', size: 'hero', image: 'https://www.pablopicasso.org/assets/img/paintings/guernica3.jpg', desc: 'A monumental anti-war statement painted in response to the Nazi bombing of the Basque town of Guernica during the Spanish Civil War. A symbol of the horrors of conflict.' },
  { title: 'The Creation of Adam', artist: 'Michelangelo', year: '1512', era: 'Renaissance', size: 'large', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/1280px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg', desc: 'A section of the Sistine Chapel ceiling illustrating the Biblical story of Genesis, the near-touching hands of God and Adam have become iconic of humanity itself.' },
  { title: 'Nighthawks', artist: 'Edward Hopper', year: '1942', era: 'American Realism', size: 'medium', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Nighthawks_by_Edward_Hopper_1942.jpg/1280px-Nighthawks_by_Edward_Hopper_1942.jpg', desc: 'A late-night diner scene that captures urban isolation and the quiet intensity of American city life. Hopper\'s most famous painting.' },
  { title: 'The Son of Man', artist: 'Rene Magritte', year: '1964', era: 'Surrealism', size: 'small', image: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Magritte_TheSonOfMan.jpg', desc: 'A self-portrait in which Magritte\'s face is obscured by a hovering green apple, challenging the relationship between what we see and what is hidden.' },
  { title: 'Sunflowers', artist: 'Vincent van Gogh', year: '1888', era: 'Post-Impressionism', size: 'small', image: 'https://mdl.artvee.com/sftb/600455sl.jpg', desc: 'One of a series of still life paintings depicting sunflowers in various stages of bloom, the thick impasto and vibrant yellows have made it an icon of joy.' },
  { title: 'Liberty Leading the People', artist: 'Eugene Delacroix', year: '1830', era: 'Romanticism', size: 'medium', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eug%C3%A8ne_Delacroix_-_Le_28_Juillet._La_Libert%C3%A9_guidant_le_peuple.jpg/1280px-Eug%C3%A8ne_Delacroix_-_Le_28_Juillet._La_Libert%C3%A9_guidant_le_peuple.jpg', desc: 'An allegorical painting commemorating the July Revolution of 1830, with the personification of Liberty leading the people forward over the bodies of the fallen.' },
  { title: 'The Persistence of Memory', artist: 'Salvador Dali', year: '1931', era: 'Surrealism', size: 'small', image: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg', desc: 'Soft melting watches draped across a barren landscape — Dali\'s most celebrated surrealist work explores the fluid nature of time and memory.' },
  { title: 'The School of Athens', artist: 'Raphael', year: '1511', era: 'Renaissance', size: 'wide', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg/1280px-%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg', desc: 'A fresco depicting the greatest mathematicians, philosophers, and scientists of classical antiquity gathered together in an idealized architectural setting.' },
  { title: 'American Gothic', artist: 'Grant Wood', year: '1930', era: 'Regionalism', size: 'small', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg/800px-Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg', desc: 'A stern farmer and his daughter stand before a house with a distinctive Gothic window. One of the most familiar images in 20th-century American art.' },
  { title: 'The Night Watch', artist: 'Rembrandt van Rijn', year: '1642', era: 'Dutch Golden Age', size: 'large', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Night_Watch_-_HD.jpg/1280px-The_Night_Watch_-_HD.jpg', desc: 'A militia company portrait brought to life with dramatic lighting and kinetic movement, shattering the conventions of group portraiture forever.' },
  { title: 'Impression, Sunrise', artist: 'Claude Monet', year: '1872', era: 'Impressionism', size: 'medium', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Monet_-_Impression%2C_Sunrise.jpg/1280px-Monet_-_Impression%2C_Sunrise.jpg', desc: 'The painting that gave the Impressionist movement its name. A hazy harbor at dawn rendered in loose, expressive brushstrokes.' },
  { title: 'Las Meninas', artist: 'Diego Velazquez', year: '1656', era: 'Baroque', size: 'medium', image: 'https://mdl.artvee.com/sftb/220954fg.jpg', desc: 'A complex composition featuring the Infanta Margarita and her entourage, with Velazquez painting himself painting — a riddle of perspectives.' },
  { title: 'Salvator Mundi', artist: 'Leonardo da Vinci', year: '1500', era: 'Renaissance', size: 'small', image: 'https://mdl.artvee.com/sftb/300215rg.jpg', desc: 'Christ depicted as Savior of the World, holding a crystal orb. Sold for $450.3 million in 2017, making it the most expensive painting ever sold.' },
  { title: 'The Garden of Earthly Delights', artist: 'Hieronymus Bosch', year: '1505', era: 'Northern Renaissance', size: 'wide', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/The_Garden_of_earthly_delights.jpg/1280px-The_Garden_of_earthly_delights.jpg', desc: 'A triptych depicting the Garden of Eden, a surreal paradise of earthly pleasures, and a hellscape of damnation — among the most ambitious and mysterious paintings ever created.' },
  { title: "Whistler's Mother", artist: 'James McNeill Whistler', year: '1871', era: 'Tonalism', size: 'medium', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Whistlers_Mother_high_res.jpg/1280px-Whistlers_Mother_high_res.jpg', desc: 'Formally titled "Arrangement in Grey and Black No. 1," this austere portrait of the artist\'s mother has become an icon of American art and motherhood.' },
  { title: 'The Arnolfini Portrait', artist: 'Jan van Eyck', year: '1434', era: 'Northern Renaissance', size: 'small', image: 'https://mdl.artvee.com/sftb/221306fg.jpg', desc: 'A full-length double portrait considered one of the most original and complex paintings in Western art, renowned for its rich symbolism and pioneering use of oil paint.' },
  { title: 'The Last Supper', artist: 'Leonardo da Vinci', year: '1498', era: 'Renaissance', size: 'wide', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg/1280px-The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg', desc: 'Capturing the moment Christ announces one of his disciples will betray him, each apostle reacts with individual emotion — a dramatic masterpiece of narrative composition.' },
  { title: 'The Third of May 1808', artist: 'Francisco Goya', year: '1814', era: 'Romanticism', size: 'medium', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/El_Tres_de_Mayo%2C_by_Francisco_de_Goya%2C_from_Prado_thin_black_margin.jpg/1280px-El_Tres_de_Mayo%2C_by_Francisco_de_Goya%2C_from_Prado_thin_black_margin.jpg', desc: 'A harrowing depiction of the execution of Spanish resisters by Napoleon\'s soldiers. Goya\'s unflinching spotlight on the brutality of war influenced generations.' },
  { title: 'Bal du moulin de la Galette', artist: 'Pierre-Auguste Renoir', year: '1876', era: 'Impressionism', size: 'medium', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Pierre-Auguste_Renoir%2C_Le_Moulin_de_la_Galette.jpg/1280px-Pierre-Auguste_Renoir%2C_Le_Moulin_de_la_Galette.jpg', desc: 'A sun-dappled scene of Parisians dancing at an open-air dance hall in Montmartre, celebrating the joy and beauty of everyday life.' },
  { title: "Les Demoiselles d'Avignon", artist: 'Pablo Picasso', year: '1907', era: 'Proto-Cubism', size: 'small', image: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Les_Demoiselles_d%27Avignon.jpg', desc: 'Five nude women composed of flat, splintered planes with African-mask-like faces. The painting that shattered conventions and gave birth to Cubism.' },
  { title: 'Luncheon of the Boating Party', artist: 'Pierre-Auguste Renoir', year: '1881', era: 'Impressionism', size: 'large', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Pierre-Auguste_Renoir_-_Luncheon_of_the_Boating_Party_-_Google_Art_Project.jpg/1280px-Pierre-Auguste_Renoir_-_Luncheon_of_the_Boating_Party_-_Google_Art_Project.jpg', desc: 'Friends and lovers gather on a sunlit balcony overlooking the Seine — a warm, convivial celebration of Impressionist color and camaraderie.' },
  { title: 'A Sunday on La Grande Jatte', artist: 'Georges Seurat', year: '1886', era: 'Pointillism', size: 'wide', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/1280px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg', desc: 'Composed entirely of tiny dots of color, this monumental scene of Parisian leisure established Pointillism and transformed the science of color in painting.' },
];

const ALL_ERAS = ['All', ...Array.from(new Set(paintings.map((p) => p.era)))];

const sizeMap: Record<string, string> = {
  hero: styles.cardHero,
  large: styles.cardLarge,
  medium: styles.cardMedium,
  small: styles.cardSmall,
  wide: styles.cardWide,
};

export default function GalleryPage() {
  const { play } = useSound();
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [activeEra, setActiveEra] = useState('All');

  const filtered = activeEra === 'All' ? paintings : paintings.filter((p) => p.era === activeEra);

  // Close modal on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPainting(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTag}>Curated Collection</span>
            <h1 className={styles.headerTitle}>The Gallery</h1>
            <p className={styles.headerSub}>
              30 masterworks spanning 600 years of human creativity — from Renaissance genius to modern rebellion.
            </p>
          </div>
        </div>

        {/* Category pills */}
        <div className={styles.categories}>
          {ALL_ERAS.map((era) => (
            <button
              key={era}
              className={`${styles.categoryPill} ${activeEra === era ? styles.categoryPillActive : ''}`}
              onClick={() => {
                play('click');
                setActiveEra(era);
              }}
              onMouseEnter={() => play('hover')}
            >
              {era}
            </button>
          ))}
        </div>

        {/* Bento Grid */}
        <div className={styles.bentoGrid}>
          {filtered.map((painting, i) => {
            const isHero = painting.size === 'hero';

            // Insert quote card after 3rd item
            const showQuoteAfter = i === 2 && activeEra === 'All';
            // Insert stats after 7th item
            const showStatsAfter = i === 6 && activeEra === 'All';

            return (
              <ArtCardGroup key={painting.title}>
                <div
                  className={`${styles.artCard} ${sizeMap[painting.size]}`}
                  onClick={() => { play('click'); setSelectedPainting(painting); }}
                  onMouseEnter={() => play('hover')}
                >
                  <div className={styles.frame}>
                    <div className={styles.frameInner}>
                      <img src={painting.image} alt={painting.title} loading="lazy" draggable={false} referrerPolicy="no-referrer" />
                      {isHero && (
                        <>
                          <div className={styles.frameGradient} />
                          <div className={styles.heroOverlay}>
                            <span className={styles.heroOverlayTitle}>{painting.title}</span>
                            <span className={styles.heroOverlayArtist}>{painting.artist}, {painting.year}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {!isHero && (
                    <div className={styles.cardMeta}>
                      <div className={styles.metaText}>
                        <span className={styles.metaTitle}>{painting.title}</span>
                        <span className={styles.metaArtist}>{painting.artist}, {painting.year}</span>
                      </div>
                      <span className={styles.metaEra}>{painting.era}</span>
                    </div>
                  )}
                </div>

                {showQuoteAfter && (
                  <div className={styles.quoteCard}>
                    <span className={styles.quoteText}>
                      &ldquo;Every artist was first an amateur.&rdquo;
                    </span>
                    <span className={styles.quoteAuthor}>Ralph Waldo Emerson</span>
                  </div>
                )}

                {showStatsAfter && (
                  <div className={styles.statsCard}>
                    <span className={styles.statsLabel}>Gallery Stats</span>
                    <div className={styles.statsGrid}>
                      <div className={styles.statItem}>
                        <span className={styles.statValue}>30</span>
                        <span className={styles.statLabel}>Masterworks</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statValue}>12</span>
                        <span className={styles.statLabel}>Art Movements</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statValue}>600</span>
                        <span className={styles.statLabel}>Years Spanned</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statValue}>22</span>
                        <span className={styles.statLabel}>Artists Featured</span>
                      </div>
                    </div>
                  </div>
                )}
              </ArtCardGroup>
            );
          })}

          {/* Bottom collection banner */}
          {activeEra === 'All' && (
            <div className={styles.collectionBanner}>
              <div className={styles.bannerLeft}>
                <span className={styles.bannerTitle}>Start Your Collection</span>
                <span className={styles.bannerSub}>Own museum-grade prints of these masterworks — minted on Base.</span>
              </div>
              <button
                className={styles.bannerButton}
                onClick={() => play('click')}
                onMouseEnter={() => play('hover')}
              >
                Browse Prints
              </button>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedPainting && (
          <div className={styles.detailOverlay} onClick={() => setSelectedPainting(null)}>
            <div className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.detailImageWrap}>
                <img className={styles.detailImage} src={selectedPainting.image} alt={selectedPainting.title} referrerPolicy="no-referrer" />
              </div>
              <div className={styles.detailInfo}>
                <span className={styles.detailEra}>{selectedPainting.era} &middot; {selectedPainting.year}</span>
                <span className={styles.detailTitle}>{selectedPainting.title}</span>
                <span className={styles.detailArtist}>{selectedPainting.artist}</span>
                <div className={styles.detailDivider} />
                <p className={styles.detailDesc}>{selectedPainting.desc}</p>
                <div className={styles.detailActions}>
                  <button
                    className={styles.detailBuyButton}
                    onClick={() => play('click')}
                    onMouseEnter={() => play('hover')}
                  >
                    Mint Print
                  </button>
                  <button
                    className={styles.detailSaveButton}
                    onClick={() => play('click')}
                    onMouseEnter={() => play('hover')}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
            <button
              className={styles.detailClose}
              onClick={() => setSelectedPainting(null)}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/** Fragment wrapper so we can return multiple grid children per iteration */
function ArtCardGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
