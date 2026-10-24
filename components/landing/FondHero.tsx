/**
 * Fond de l'ouverture : papier pointé, axes de construction en tirets comme sur
 * un plan, et halo bleu de tirage derrière la démo. Purement décoratif et
 * immobile ; il s'efface côté texte et en bas de section.
 */

const AXES_V = [860, 1080, 1300, 1520];
const AXES_H = [250, 480, 710];

export default function FondHero() {
  return (
    <div className="zs-fond-hero" aria-hidden="true">
      <div className="zs-fond-halo" />
      <svg className="zs-fond-trame" viewBox="0 0 1600 900" preserveAspectRatio="xMaxYMid slice" focusable="false">
        <defs>
          <pattern id="zs-points" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1.1" fill="var(--zs-tirage)" fillOpacity=".22" />
          </pattern>
        </defs>
        <rect width="1600" height="900" fill="url(#zs-points)" />
        <g className="zs-axes" stroke="var(--zs-tirage)" strokeOpacity=".28" strokeWidth="1" fill="none">
          {AXES_V.map((x) => <path key={x} d={`M${x} 0V900`} strokeDasharray="14 5 2 5" />)}
          {AXES_H.map((y) => <path key={y} d={`M760 ${y}H1600`} strokeDasharray="14 5 2 5" />)}
        </g>
      </svg>
    </div>
  );
}
