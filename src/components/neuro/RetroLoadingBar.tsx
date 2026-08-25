import { motion } from "framer-motion";

interface RetroLoadingBarProps {
  /** 0 – 100 */
  progress: number;
  label?: string;
  message?: string;
}

const SEGMENTS = 20;

export default function RetroLoadingBar({
  progress,
  label = "LOADING",
  message,
}: RetroLoadingBarProps) {
  const filled = Math.round((progress / 100) * SEGMENTS);

  return (
    <div className="w-full max-w-md mx-auto text-center space-y-3">
      <motion.p
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        className="font-pixel text-[10px] text-coral tracking-[0.25em]"
      >
        {label}
      </motion.p>

      {message && (
        <p className="font-mono text-xs text-cream/60 h-5 overflow-hidden">
          {message}
        </p>
      )}

      <div className="flex gap-[3px] justify-center">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: i < filled ? 1 : 0.15,
              scale: i < filled ? 1 : 0.8,
              backgroundColor: i < filled ? "#45D6E8" : "#16202E",
            }}
            transition={{ duration: 0.15, delay: i * 0.02 }}
            className="w-3 h-5"
          />
        ))}
      </div>

      <p className="font-mono text-xs text-cream/40">{Math.round(progress)}%</p>
    </div>
  );
}
