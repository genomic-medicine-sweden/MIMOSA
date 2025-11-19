import "primeflex/primeflex.css";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { PrimeReactProvider } from "primereact/api";

export const metadata = {
  title: "MIMOSA",
  description:
    "Microbial Investigation, Monitoring, Outbreak Surveillance, and Analysis.",
  icons: {
    icon: "/MIMOSA_ICO.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PrimeReactProvider>{children}</PrimeReactProvider>
      </body>
    </html>
  );
}
