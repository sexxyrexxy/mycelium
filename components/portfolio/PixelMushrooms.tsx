// components/portfolio/MushroomSprites.tsx
import React from "react";

/** PUBLIC API ---------------------------------------------------------------
 * <MushroomSprite species="flyAgaric" size={128} pulse scaleMax={1.18} duration={2}/>
 * <MushroomGarden items={[{species:'flyAgaric'}, {species:'shiitake'}, {species:'oyster'}]} />
 */

export type Species = "flyAgaric" | "shiitake" | "oyster";

type CommonProps = {
  /** CSS pixels */
  size?: number;
  /** seconds for full cycle (grow→shrink) */
  duration?: number;
  /** peak scale */
  scaleMax?: number;
  /** enable pulse animation */
  pulse?: boolean;
  /** enable cap color cycling (SMIL) */
  colorCycle?: boolean;
  /** override cap cycle */
  capColors?: string[];
};

type SpriteProps = CommonProps & {
  species: Species;
  className?: string;
};

/* ----------------------------- SHAPES (16x16 grid) ----------------------------- */

function FlyAgaricShape({ duration = 2, scaleMax = 1.18, pulse = true, colorCycle, capColors }: CommonProps) {
  const capVals =
    (capColors && capColors.join(";")) ||
    (colorCycle ? ["#d91c1c", "#ff7a00", "#ffd500", "#d91c1c"].join(";") : "#d91c1c");

  return (
    <svg viewBox="0 0 16 16" width="100%" height="100%" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      <g>
        {pulse && (
          <animateTransform attributeName="transform" type="scale" values={`1;${scaleMax};1`} dur={`${duration}s`} repeatCount="indefinite" />
        )}

        {/* Stem */}
        <rect x="7" y="8" width="2" height="6" fill="#fff1d6" />
        <rect x="6" y="10" width="1" height="3" fill="#e7d0a7" />
        <rect x="9" y="10" width="1" height="3" fill="#e7d0a7" />

        {/* Cap rows */}
        <rect x="3" y="4" width="10" height="1" fill="#d91c1c">
          {colorCycle && <animate attributeName="fill" values={capVals as string} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>
        <rect x="2" y="5" width="12" height="2" fill="#e21f1f">
          {colorCycle && <animate attributeName="fill" values={capVals as string} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>
        <rect x="3" y="7" width="10" height="1" fill="#e21f1f">
          {colorCycle && <animate attributeName="fill" values={capVals as string} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>

        {/* White dots */}
        <rect x="5" y="5" width="2" height="1" fill="#ffffff" />
        <rect x="9" y="6" width="2" height="1" fill="#ffffff" />
      </g>
    </svg>
  );
}

function ShiitakeShape({ duration = 2, scaleMax = 1.15, pulse = true, colorCycle, capColors }: CommonProps) {
  // earthy browns
  const cycle = capColors ?? ["#7a4e2a", "#8f5c33", "#a56a3c", "#7a4e2a"];
  const capVals = cycle.join(";");

  return (
    <svg viewBox="0 0 16 16" width="100%" height="100%" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      <g>
        {pulse && (
          <animateTransform attributeName="transform" type="scale" values={`1;${scaleMax};1`} dur={`${duration}s`} repeatCount="indefinite" />
        )}

        {/* Thick stem */}
        <rect x="7" y="9" width="2" height="5" fill="#ead9bf" />
        <rect x="6" y="10" width="1" height="3" fill="#d2c1a6" />
        <rect x="9" y="10" width="1" height="3" fill="#d2c1a6" />

        {/* Rounded-ish cap (darker top) */}
        <rect x="3" y="6" width="10" height="1" fill="#6b4223">
          {colorCycle && <animate attributeName="fill" values={capVals} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>
        <rect x="2" y="7" width="12" height="2" fill="#7a4e2a">
          {colorCycle && <animate attributeName="fill" values={capVals} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>
        <rect x="3" y="9" width="10" height="1" fill="#8b5a33">
          {colorCycle && <animate attributeName="fill" values={capVals} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>

        {/* Subtle gills peeking */}
        <rect x="5" y="10" width="6" height="1" fill="#f1e7d2" opacity="0.6" />
      </g>
    </svg>
  );
}

function OysterShape({ duration = 2, scaleMax = 1.12, pulse = true, colorCycle, capColors }: CommonProps) {
  // cool greys / creams
  const cycle = capColors ?? ["#cfcfd4", "#e0e0e6", "#d6d6db", "#cfcfd4"];
  const capVals = cycle.join(";");

  return (
    <svg viewBox="0 0 16 16" width="100%" height="100%" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      <g>
        {pulse && (
          <animateTransform attributeName="transform" type="scale" values={`1;${scaleMax};1`} dur={`${duration}s`} repeatCount="indefinite" />
        )}

        {/* Shelf-like stacked caps */}
        {/* Upper shelf */}
        <rect x="4" y="3" width="8" height="1" fill="#c8c8ce">
          {colorCycle && <animate attributeName="fill" values={capVals} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>
        <rect x="3" y="4" width="10" height="2" fill="#d4d4da">
          {colorCycle && <animate attributeName="fill" values={capVals} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>
        {/* Lower wider shelf */}
        <rect x="2" y="6" width="12" height="2" fill="#dedee4">
          {colorCycle && <animate attributeName="fill" values={capVals} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>
        <rect x="3" y="8" width="10" height="1" fill="#cfcfd4">
          {colorCycle && <animate attributeName="fill" values={capVals} dur={`${duration}s`} repeatCount="indefinite" />}
        </rect>

        {/* Short lateral stem to the left (oysters often side-attached) */}
        <rect x="5" y="9" width="2" height="4" fill="#efe9db" />
        <rect x="4" y="10" width="1" height="2" fill="#ddd2bd" />
      </g>
    </svg>
  );
}

/* ----------------------------- PUBLIC COMPONENTS ----------------------------- */

export function MushroomSprite({
  species,
  size = 128,
  duration = 2,
  scaleMax = 1.18,
  pulse = true,
  colorCycle = true,
  capColors,
  className,
}: SpriteProps) {
  // Wrap the 16x16 SVG in a sized container so it can be used anywhere.
  return (
    <div className={className} style={{ width: size, height: size }}>
      {species === "flyAgaric" && (
        <FlyAgaricShape duration={duration} scaleMax={scaleMax} pulse={pulse} colorCycle={colorCycle} capColors={capColors} />
      )}
      {species === "shiitake" && (
        <ShiitakeShape duration={duration} scaleMax={Math.min(scaleMax, 1.15)} pulse={pulse} colorCycle={colorCycle} capColors={capColors} />
      )}
      {species === "oyster" && (
        <OysterShape duration={duration} scaleMax={Math.min(scaleMax, 1.12)} pulse={pulse} colorCycle={colorCycle} capColors={capColors} />
      )}
    </div>
  );
}

/** Simple layout helper to render many mushrooms in a row/grid */
export function MushroomGarden({
  items,
  gap = 16,
  wrap = true,
}: {
  items: Array<Partial<CommonProps> & { species: Species }>;
  gap?: number;
  wrap?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap,
        flexWrap: wrap ? "wrap" : "nowrap",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {items.map((it, idx) => (
        <MushroomSprite key={idx} species={it.species} size={it.size ?? 112} duration={it.duration ?? 2} />
      ))}
    </div>
  );
}

export default MushroomSprite;
