import type { Metadata } from "next";
import { StudioShell } from "@/components/studio-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
export const metadata: Metadata = {
  title: "Sovia · Avatar Studio",
  description: "Create, edit, and preview illustration characters on your computer.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>
          <StudioShell>{children}</StudioShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
