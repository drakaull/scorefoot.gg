import localFont from "next/font/local";

// Self-hosted (OFL, see src/fonts/OFL.txt): no request to a font service.
export const jakarta = localFont({
  src: "../fonts/PlusJakartaSans-Variable.woff2",
  weight: "200 800",
  variable: "--font-jakarta",
  display: "swap",
});
