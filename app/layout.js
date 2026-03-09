import "./globals.css";

export const metadata = {
  title: "WebWeave",
  description: "Browser-based Next.js AI editor",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
