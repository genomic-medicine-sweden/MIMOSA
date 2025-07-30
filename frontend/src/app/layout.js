// app/layout.js

export const metadata = {
  title: "MIMOSA",
  description: "Microbial Investigation,Monitoring,Outbreak Surveillance, and Analysis.",
  icons: {
    icon: "/MIMOSA_ICO.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

