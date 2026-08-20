/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        primaryHover: "var(--accent)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        title: "var(--foreground)",
        text: "var(--foreground)",
        muted: "var(--muted-foreground)",
        secondary: "var(--secondary)",
        border: "var(--border)",
        inputBg: "var(--input-background)",
      },
      fontFamily: {
        sans: ["Pretendard", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
