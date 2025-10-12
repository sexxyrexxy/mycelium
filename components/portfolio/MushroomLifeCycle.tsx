"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Stage = "RAIN" | "SPROUT" | "BLOOM" | "SPORE" | "WILT" | "REBIRTH";
const STAGES: Stage[] = ["RAIN", "SPROUT", "BLOOM", "SPORE", "WILT", "REBIRTH"];

export default function MushroomLifeCycle({
  size = 320,
  secondsPerStage = 2.2,
}: { size?: number; secondsPerStage?: number }) {
  const [idx, setIdx] = useState(0);
  const stage = STAGES[idx];

  // cycle
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % STAGES.length), secondsPerStage * 1000);
    return () => clearInterval(id);
  }, [secondsPerStage]);

  // animation clock
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => { setT(x => x + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // easing helpers
  const clamp01 = (x:number)=> Math.max(0, Math.min(1, x));
  const ease = (x:number)=> x<0?0:x>1?1:x*x*(3-2*x);

  // normalized progress 0..1 within current stage (for subtle transitions)
  const p = (t % Math.round(secondsPerStage*60)) / Math.round(secondsPerStage*60);
  const k = ease(p);

  // palette & effects per stage
  const style = useMemo(() => {
    switch(stage){
      case "RAIN":   return { cap:"#C94539", outline:"#2B2626", stem:"#EEEAE0", dim:0.35, bg:"#0B0E12" };
      case "SPROUT": return { cap:"#D84C3E", outline:"#2B2626", stem:"#F1EEE6", dim:0.15, bg:"#0B0E12" };
      case "BLOOM":  return { cap:"#E34F41", outline:"#2B2626", stem:"#F4F1E9", dim:0.0,  bg:"#0B0E12" };
      case "SPORE":  return { cap:"#E04A3C", outline:"#2B2626", stem:"#F3EFE6", dim:0.0,  bg:"#0B0E12" };
      case "WILT":   return { cap:"#9A685F", outline:"#2B2626", stem:"#D9D6CF", dim:0.45, bg:"#0B0E12" };
      case "REBIRTH":return { cap:"#D94A3D", outline:"#2B2626", stem:"#F0ECE3", dim:0.1,  bg:"#0B0E12" };
    }
  }, [stage]);

  // geometry (viewBox 0..100)
  const vb=100;

  // growth amounts
  const sproutH = 8 + 18*k;            // stem grow during SPROUT
  const bloomPulse = 1 + (stage==="BLOOM" ? 0.02*Math.sin(t/8) : 0);
  const wiltTilt = stage==="WILT" ? ( -8 * k ) : 0; // droop degrees
  const yBob = (stage==="BLOOM"||stage==="SPORE") ? Math.sin(t/20)*0.8 : 0;

  // cap size across stages
  let capScale = 0.6;
  if (stage==="SPROUT") capScale = 0.6 + 0.35*k;
  if (stage==="BLOOM" || stage==="SPORE") capScale = 0.95*bloomPulse;
  if (stage==="WILT") capScale = 0.95*(1 - 0.15*k);
  if (stage==="REBIRTH") capScale = 0.85;

  // stem height across stages
  let stemStretch = 0.7;
  if (stage==="SPROUT") stemStretch = 0.7 + 0.5*k;
  if (stage==="BLOOM"||stage==="SPORE") stemStretch = 1.2;
  if (stage==="WILT") stemStretch = 1.0 - 0.2*k;
  if (stage==="REBIRTH") stemStretch = 0.9;

  // spores (SPORE stage)
  const spores = useMemo(()=>{
    return Array.from({length: 36}).map((_,i)=>{
      const a = (i/36)*Math.PI*2 + (t/60);
      const R = 8 + (i%6)*3 + (stage==="SPORE"? k*14 : 0);
      return { x: 50+Math.cos(a)*R, y: 52+Math.sin(a)*R, r: 0.8 + (i%3)*0.3 };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, t, k]);

  // rain lines
  const rain = Array.from({length: 18}).map((_,i)=>{
    const x = 20 + (i%9)*7 + ((i%3)*1.5);
    const y = ((t + i*15) % 120);
    return { x, y: y/2, len: 6 + (i%4) };
  });

  // fairy ring (REBIRTH)
  const ringR = stage==="REBIRTH" ? 10 + k*24 : 0;

  // soil arc
  const soil = "M5,86 C24,80 76,80 95,86 L95,100 L5,100 Z";

  return (
    <div style={{ display:"grid", gap:8, placeItems:"center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} style={{ borderRadius: 16, background: style.bg }}>
        {/* soil */}
        <path d={soil} fill="#1E232A"/>

        {/* rain stage */}
        {stage==="RAIN" && (
          <g opacity={0.8}>
            {rain.map((d,i)=>(
              <line key={i} x1={d.x} y1={d.y} x2={d.x} y2={d.y+d.len}
                    stroke="#7FB3FF" strokeWidth={0.8} strokeLinecap="round" />
            ))}
          </g>
        )}

        {/* REBIRTH fairy ring */}
        {stage==="REBIRTH" && (
          <circle cx={50} cy={86} r={ringR} fill="none" stroke="#8CF0A7" strokeOpacity="0.35" strokeWidth="1.5" />
        )}

        {/* group that moves/rotates a bit */}
        <g style={{
          transformOrigin: "50px 70px",
          transform: `translateY(${yBob}px) rotate(${wiltTilt}deg)`,
          opacity: 1 - style.dim
        }}>
          {/* stem */}
          <g>
            {/* outline */}
            <path d="M35,72 C33,84 34,92 38,96 C41,99 59,99 62,96 C66,92 67,84 65,72
                     C65,72 57,74 50,74 C43,74 35,72 35,72 Z"
                  fill="#FFFFFF" stroke={style.outline} strokeWidth={2.8}/>
            {/* fill - scaled by stemStretch */}
            <g style={{ transformOrigin: "50px 74px", transform: `scaleY(${stemStretch})` }}>
              <path d="M38,74 C36.5,84 37,91 40,94 C42,96 58,96 60,94 C63,91 63.5,84 62,74
                       C62,74 56,75 50,75 C44,75 38,74 38,74 Z"
                    fill="#ECE8DE" />
            </g>
          </g>

          {/* cap (scaled by capScale) */}
          <g style={{ transformOrigin: "50px 60px", transform: `scale(${capScale})` }}>
            {/* outer cap */}
            <path d="M10,50 C10,26 31,10 50,10 C69,10 90,26 90,50
                     C90,64 77,72 62,75 C58,76 54,77 50,77 C46,77 42,76 38,75
                     C23,72 10,64 10,50 Z"
                  fill={style.cap} stroke={style.outline} strokeWidth={3} />

            {/* inner glossy band */}
            <path d="M14,50 C14,30 33,16 50,16 C67,16 86,30 86,50
                     C86,60 76,67 63,69 C58.5,70 53.5,71 50,71 C46.5,71 41.5,70 37,69
                     C24,67 14,60 14,50 Z"
                  fill="#FFFFFF" opacity={0.16} />

            {/* spots */}
            <g>
              <ellipse cx={28} cy={40} rx={6.2} ry={5.2} fill="#fff" />
              <ellipse cx={44} cy={32} rx={4.0} ry={3.6} fill="#fff" />
              <ellipse cx={67} cy={36} rx={6.0} ry={5.0} fill="#fff" />
              <ellipse cx={76} cy={46} rx={4.5} ry={3.9} fill="#fff" />
              <ellipse cx={53} cy={46} rx={3.6} ry={3.2} fill="#fff" />
            </g>
          </g>
        </g>

        {/* spores on S.P.O.R.E */}
        {stage==="SPORE" && (
          <g opacity={0.95}>
            {spores.map((s,i)=>(
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" />
            ))}
          </g>
        )}

        {/* stage label */}
        <g>
          <rect x={28} y={6} width={44} height={10} rx={4} fill="rgba(255,255,255,0.22)"/>
          <text x={50} y={13} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="5" fontWeight={700} fill="#fff">
            {stage}
          </text>
        </g>
      </svg>

      <small style={{ color:"#aaa" }}>
        Rain → Sprout → Bloom → Spore → Wilt → Rebirth (loops)
      </small>
    </div>
  );
}
