// Variantes reutilizadas com framer-motion.

const ease = [0.22, 1, 0.36, 1];

export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const item = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.34, ease } },
};

export const cardHover = {
  rest: { y: 0 },
  hover: { y: -3, transition: { duration: 0.18 } },
};
