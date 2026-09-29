import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EaseSell",
  description: "Service for the EaseSell iPhone app.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f4faf7", color: "#14241f" }}>
        {children}
      </body>
    </html>
  );
}
