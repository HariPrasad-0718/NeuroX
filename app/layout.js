import "./globals.css";

export const metadata = {
  title: "NeuroX - Design Thinking Platform",
  description: "A design thinking platform for teams",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
