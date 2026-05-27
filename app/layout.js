import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "NeuroX - Design Thinking Platform",
  description: "A design thinking platform for teams",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
