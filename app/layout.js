import "./globals.css";

export const metadata = {
  title: "Referral Compass — AI referral co-pilot",
  description:
    "From 30–60 seconds of dictation to a ranked referral destination and a filled form. Synthetic-data hackathon demo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
