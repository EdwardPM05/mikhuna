/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#241F21",
        maroon: "#7A1220",
        chili: "#E5131B",
        mango: "#F7941D",
        peach: "#FFC993",
        cream: "#FDF3E7",
      },
      fontFamily: {
        display: ["Baloo2_800ExtraBold"],
        "display-bold": ["Baloo2_700Bold"],
        "display-medium": ["Baloo2_600SemiBold"],
        body: ["NunitoSans_400Regular"],
        "body-semibold": ["NunitoSans_600SemiBold"],
        "body-bold": ["NunitoSans_700Bold"],
        "body-extrabold": ["NunitoSans_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
