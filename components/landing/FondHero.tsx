/**
 * Fond de l'ouverture : papier pointé, axes de construction cotés comme sur un
 * plan (A, B, C… / 1, 2, 3) et halo bleu de tirage derrière la démo. Purement
 * décoratif et immobile ; il s'efface côté texte et en bas de section.
 */

const AXES_V = [{ x: 860, n: "A" }, { x: 1080, n: "B" }, { x: 1300, n: "C" }, { x: 1520, n: "D" }];
const AXES_H = [{ y: 250, n: "1" }, { y: 480, n: "2" }, { y: 710, n: "3" }];

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
          {AXES_V.map((a) => <path key={a.n} d={`M${a.x} 0V900`} strokeDasharray="14 5 2 5" />)}
          {AXES_H.map((a) => <path key={a.n} d={`M792 ${a.y}H1600`} strokeDasharray="14 5 2 5" />)}
          {AXES_V.map((a) => <circle key={a.n} cx={a.x} cy="132" r="15" fill="var(--zs-papier)" />)}
          {AXES_H.map((a) => <circle key={a.n} cx="776" cy={a.y} r="15" fill="var(--zs-papier)" />)}
        </g>
        <g className="zs-axes" fill="var(--zs-tirage)" fillOpacity=".55" fontSize="13" fontWeight="600" textAnchor="middle" fontFamily="inherit">
          {AXES_V.map((a) => <text key={a.n} x={a.x} y="136.5">{a.n}</text>)}
          {AXES_H.map((a) => <text key={a.n} x="776" y={a.y + 4.5}>{a.n}</text>)}
        </g>
      </svg>
    </div>
  );
}
