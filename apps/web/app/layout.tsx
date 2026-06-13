import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import { Providers } from "./providers";
import "../styles/globals.css";
import "../styles/tokens.css";
import "../styles/app.css";
import "../styles/landing.css";
import "../styles/admin.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata = {
  title: "Monana — Food & Grocery Delivery",
  description:
    "Order restaurant meals and fresh groceries in Dar es Salaam. Shop on-demand or subscribe weekly. Web + WhatsApp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
