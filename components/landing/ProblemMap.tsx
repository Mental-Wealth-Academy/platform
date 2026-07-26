'use client';

import React, { useEffect, useRef, useState } from 'react';
import type * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './ProblemMap.module.css';

const GEOJSON_URL = '/data/redlining-oakland.geojson';
const PRIVATE_AREA_LABEL = 'D18';
const MAX_MAP_ZOOM = 11.25;

// The dominant learning platforms, named for the "digital filing cabinet" stage.
const PLATFORMS = ['Blackboard', 'Moodle', 'Canvas'] as const;

// Learners in the 15-node field: a few went quiet, a few stayed connected, and
// the cabinet records the same thing for both.
const NODE_QUIET = new Set([1, 6, 9, 13]);
const NODE_CONNECTED = new Set([3, 11]);

// Show the full HOLC grading field. D (redlined) and A ("best"/wealthy) remain
// the strongest figures, while the B and C survey areas complete the historical
// context rather than leaving most of the city visually unmarked.
const HIDDEN: L.PathOptions = { weight: 0, fillOpacity: 0, interactive: false };
const GRADE_STYLE: Record<string, L.PathOptions> = {
  D: { color: 'var(--color-danger)', weight: 1, fillColor: 'var(--color-danger)', fillOpacity: 0.52, interactive: false },
  A: { color: 'var(--color-streak)', weight: 1, fillColor: 'var(--color-streak)', fillOpacity: 0.48, interactive: false },
  B: { color: 'var(--color-primary)', weight: 0.6, fillColor: 'var(--color-primary)', fillOpacity: 0.32, interactive: false },
  C: { color: 'var(--color-warning)', weight: 0.6, fillColor: 'var(--color-warning)', fillOpacity: 0.34, interactive: false },
};
const PRIVATE_AREA_STYLE: L.PathOptions = {
  color: 'var(--color-accent)',
  weight: 1,
  fillColor: 'var(--color-accent)',
  fillOpacity: 0.52,
  interactive: false,
};

const SCHOOL_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">' +
  '<path d="M12 3 1 8l11 5 9-4.09V14h2V8L12 3zM5 13.18v2.5L12 19l7-3.32v-2.5L12 16 5 13.18z"/></svg>';

function markerHtml(variant: 'red' | 'green' | 'private'): string {
  return (
    `<div class="rl-mk rl-${variant}">` +
    `<span class="rl-cap">${SCHOOL_SVG}</span>` +
    `<span class="rl-pin"></span>` +
    `</div>`
  );
}

export const ProblemMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Only build the (tile-fetching) map once it scrolls near the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let map: L.Map | null = null;
    const controller = new AbortController();

    const reveal = () => containerRef.current?.classList.add(styles.mapReady);

    (async () => {
      const mod = await import('leaflet');
      const LR = (((mod as unknown as { default?: typeof L }).default ?? mod) as typeof L);
      if (cancelled || !containerRef.current) return;

      const oaklandResponse = await fetch(GEOJSON_URL, { signal: controller.signal });
      if (!oaklandResponse.ok) {
        throw new Error('Problem map data could not be loaded.');
      }

      const data = await oaklandResponse.json();
      if (cancelled || !containerRef.current) return;

      map = LR.map(containerRef.current, {
        center: [37.8, -122.25],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });

      const tiles = LR.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
          detectRetina: true,
        },
      ).addTo(map);
      tiles.on('load', reveal);

      const oaklandLayer = LR.geoJSON(data, {
        style: (f) => {
          if (f?.properties?.label === PRIVATE_AREA_LABEL) return PRIVATE_AREA_STYLE;
          return (f?.properties?.grade && GRADE_STYLE[f.properties.grade]) || HIDDEN;
        },
        interactive: false,
      }).addTo(map);

      const icon = (variant: 'red' | 'green' | 'private') =>
        LR.divIcon({ html: markerHtml(variant), className: '', iconSize: [0, 0], iconAnchor: [0, 0] });

      const liveMap = map;
      const m = data.metadata.markers || {};
      const redlined: number[][] = Array.isArray(m.redlined)
        ? (Array.isArray(m.redlined[0]) ? m.redlined : [m.redlined])
        : [];
      const southernmostRedlined = Math.min(...redlined.map((pt) => pt[1]));
      const markerLatLngs: [number, number][] = [];
      redlined.forEach((pt) => {
        const isPrivate = pt[1] === southernmostRedlined;
        markerLatLngs.push([pt[1], pt[0]]);
        LR.marker([pt[1], pt[0]], {
          icon: icon(isPrivate ? 'private' : 'red'),
          interactive: false,
          keyboard: false,
        }).addTo(liveMap);
      });
      if (m.wealthy) {
        markerLatLngs.push([m.wealthy[1], m.wealthy[0]]);
        LR.marker([m.wealthy[1], m.wealthy[0]], { icon: icon('green'), interactive: false, keyboard: false }).addTo(map);
      }

      // Frame the East Bay redlining and school markers, reserving space up top so
      // the highlights sit centered below the story text.
      const surveyBounds = oaklandLayer.getBounds();
      markerLatLngs.forEach((ll) => surveyBounds.extend(ll));
      map.fitBounds(surveyBounds, {
        animate: false,
        maxZoom: MAX_MAP_ZOOM,
        paddingTopLeft: [26, 200],
        paddingBottomRight: [26, 48],
      });

      // Backstop: never leave the panel invisible if a tile 'load' never fires.
      window.setTimeout(reveal, 1500);
    })().catch((err) => {
      if (err?.name !== 'AbortError') {
        console.error('ProblemMap:', err);
        reveal();
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      map?.remove();
    };
  }, [visible]);

  return (
    <div className={styles.wrap}>
      <div
        className={styles.flow}
        role="group"
        aria-label="Redlining shapes school funding before kindergarten. Only about 12 percent finish a typical open online course, and isolation and loneliness are among the strongest predictors of who drops out. Legacy platforms offer stagnant curricula and few social features, leaving many online students isolated."
      >
        <article className={`${styles.stage} ${styles.mapStage}`}>
          <div
            ref={containerRef}
            className={styles.map}
            aria-hidden="true"
          />
          <div className={styles.mapShade} aria-hidden="true" />
          <div className={styles.mapStory}>
            <div className={styles.mapStoryTop}>
              <div className={styles.stageHeading}>
                <span className={styles.stageNumber}>1</span>
                <h3 className={styles.stageTitle}>Inequality in Education</h3>
              </div>
              <p className={styles.stageCopy}>
                Redlining shapes school funding before kindergarten. When housing
                taxes fund public schools, poorer areas receive fewer resources and
                less qualified educators.
              </p>
            </div>
          </div>
        </article>

        <article className={`${styles.stage} ${styles.outcomeStage}`}>
          <div className={styles.stageHeading}>
            <span className={styles.stageNumber}>2</span>
            <h3 className={styles.stageTitle}>Lack of Proficiency in Educators</h3>
          </div>
          <div className={styles.outcome}>
            <strong className={styles.outcomeValue}>70%</strong>
            <p className={styles.outcomeCopy}>
              Up to 70% of higher education instructors teaching open online courses
              report feeling inadequately trained in utilizing digital engagement
              tools, a factor that directly contributes to high learner dropout rates.
            </p>
            <div className={styles.people} aria-hidden="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <i className={index < 6 ? styles.personActive : undefined} key={index} />
              ))}
            </div>
          </div>
        </article>

        <article className={`${styles.stage} ${styles.platformStage}`}>
          <div className={styles.stageHeaderBlock}>
            <div className={styles.stageHeading}>
              <span className={styles.stageNumber}>3</span>
              <h3 className={styles.stageTitle}>Poorly Designed Infrastructure</h3>
            </div>
            <div className={styles.platformChips} aria-hidden="true">
              {PLATFORMS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>
          <p className={styles.stageCopy}>
            Legacy platforms offer stagnant curricula and few social features, leaving
            many online students isolated. Next-gen courses should hold student
            attention while improving global education.
          </p>
          <div className={styles.nodeField} aria-hidden="true">
            <div className={styles.nodeGrid}>
              {Array.from({ length: 15 }).map((_, index) => (
                <i
                  key={index}
                  className={
                    NODE_QUIET.has(index)
                      ? styles.nodeQuiet
                      : NODE_CONNECTED.has(index)
                        ? styles.nodeConnected
                        : undefined
                  }
                />
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default ProblemMap;
