import styles from './KeyFiguresSection.module.css';

export const KeyFiguresSection: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.figure}>
          <span className={styles.label}>Active Members</span>
          <div className={styles.valueRow}>
            <span className={styles.number}>100+</span>
            <span className={styles.unit}>Members</span>
          </div>
        </div>

        <div className={styles.arrow}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" className={styles.arrowSvg}>
            <g transform="matrix(1,0,0,1,100,50)" opacity="1">
              <path strokeLinecap="round" strokeLinejoin="round" fillOpacity="0" stroke="currentColor" strokeOpacity="1" strokeWidth="6" d="M-37.625,-2.125 C-37.625,-2.125 -21.875,17.25 -5,1.25 C6.895,-10.029 -7.375,-23.875 -13.75,-18.625 C-20.249,-13.273 -13.437,3.187 19.125,10.125" />
            </g>
            <g transform="matrix(1,0,0,1,-277.425,-312.154)" opacity="1">
              <g opacity="1" transform="matrix(1,0,0,1,404.259,371.794)">
                <path fill="currentColor" d="M-5.641,13.711 C-8.138,13.501 -11.955,14.671 -13.198,11.759 C-13.76,10.029 -13.053,9.278 -11.603,8.838 C-6.425,6.996 -0.721,7.911 4.48,6.571 C2.057,1.344 -1.652,-3.325 -4.518,-8.36 C-7.379,-13.17 -1.06,-16.203 1.449,-11.201 C5.121,-5.406 8.847,0.356 12.467,6.184 C13.951,8.573 13.612,11.024 11.707,12.204 C10.87,12.722 9.796,13.051 8.81,13.106 C3.996,13.374 -0.824,13.522 -5.641,13.711z" />
              </g>
            </g>
          </svg>
        </div>

        <div className={styles.figure}>
          <span className={styles.label}>Use</span>
          <div className={styles.valueRow}>
            <span className={styles.number}>Tasks</span>
            <span className={styles.unit}>/daily</span>
          </div>
        </div>

        <div className={styles.arrow}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" className={styles.arrowSvgSmall}>
            <g transform="matrix(1,0,0,1,50,25)" opacity="1">
              <path strokeLinecap="round" strokeLinejoin="round" fillOpacity="0" stroke="currentColor" strokeOpacity="1" strokeWidth="7" d="M-34.5,1.875 C-21.5,-12.125 5.75,-17.25 22.125,-0.75" />
            </g>
            <g transform="matrix(1,0,0,1,-337.576,-252.722)" opacity="1">
              <g opacity="1" transform="matrix(1,0,0,1,408.994,277.722)">
                <path fill="currentColor" d="M8.852,8.164 C8.312,4.377 7.809,1.131 7.035,-2.495 C6.782,-6.301 3.25,-12.255 6.714,-15.076 C8.784,-16.399 11.159,-14.906 11.682,-13.294 C13.957,-5.02 15.559,3.483 15.889,12.079 C16.057,14.549 13.26,15.926 11.278,15.512 C7.499,14.723 -9.432,10.983 -14.097,9.874 C-16.309,9.501 -16.62,5.912 -14.251,5.277 C-6.45,3.521 1.038,7.487 8.852,8.164z" />
              </g>
            </g>
          </svg>
        </div>

        <div className={styles.figure}>
          <span className={styles.label}>For</span>
          <div className={styles.valueRow}>
            <span className={styles.number}>15</span>
            <span className={styles.unit}>min</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default KeyFiguresSection;
