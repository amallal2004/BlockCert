import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const ParticleField = () => {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 4,
      delay: Math.random() * 4,
      color: ["neon-cyan", "neon-purple", "neon-green"][Math.floor(Math.random() * 3)],
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background:
              p.color === "neon-cyan"
                ? "hsl(195, 100%, 50%)"
                : p.color === "neon-purple"
                ? "hsl(280, 100%, 65%)"
                : "hsl(160, 100%, 50%)",
            boxShadow: `0 0 ${p.size * 4}px ${
              p.color === "neon-cyan"
                ? "hsl(195, 100%, 50%)"
                : p.color === "neon-purple"
                ? "hsl(280, 100%, 65%)"
                : "hsl(160, 100%, 50%)"
            }`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default ParticleField;
