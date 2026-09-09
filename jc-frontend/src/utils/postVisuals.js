export const getStablePostFallbackColor = (value) => {
  const hash = String(value ?? "journey").split("").reduce(
    (result, character) => ((result * 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
  const hue = Math.round((hash * 137.508) % 360);
  return `hsl(${hue} 62% 72%)`;
};
