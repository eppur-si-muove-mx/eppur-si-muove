const config = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/app/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/components/**/*.{js,jsx,ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "deep-space": {
          950: "#02040a",
          900: "#050a14",
          800: "#0a1224",
          700: "#0e1a33",
        },
        "cosmic-blue": {
          50: "#e8f1ff",
          100: "#cfe2ff",
          200: "#a6c4ff",
          300: "#7aa7ff",
          400: "#4e89ff",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#1e3a8a",
          900: "#172554",
        },
        "nebula-purple": {
          50: "#f3e8ff",
          100: "#e9d5ff",
          200: "#d8b4fe",
          300: "#c084fc",
          400: "#a855f7",
          500: "#9333ea",
          600: "#7e22ce",
          700: "#6b21a8",
          800: "#581c87",
          900: "#3b0764",
        },
        "star-orange": {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "rotate-slow": "spin 20s linear infinite",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
        "3xl": "64px",
        glass: "12px",
      },
    },
  },
  plugins: [],
};

export default config;


