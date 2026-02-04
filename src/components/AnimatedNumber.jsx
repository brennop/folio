import { animate, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import { useEffect, useRef } from "react";

const HIDDEN_MAPPING = {
  '0': '*',
  '1': '*',
  '2': '*',
  '3': '*',
  '4': '?',
  '5': '?',
  '6': '?',
  '7': '#',
  '8': '#',
  '9': '#'
}

function hideValue(formatted) {
  return [...formatted].map((ch) => HIDDEN_MAPPING[ch] ?? ch).join("");
}

export default function AnimatedNumber({ value, hidden }) {
  const ref = useRef(null);

  const raw = useMotionValue(0);

  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  useEffect(() => {
    const next = hidden ? Number("5".repeat(value.toFixed(0).length)) + 0.55 : value;

    animate(raw, next, {
      duration: 0.8,
      ease: "easeInOut"
    })
  }, [value, raw, hidden]);

  useMotionValueEvent(raw, "change", (latest) => {
    if (ref.current) {
      const formatted = formatter.format(latest);
      ref.current.textContent = hidden ? hideValue(formatted) : formatted 
    }
  });

  return <span ref={ref} />;
}
