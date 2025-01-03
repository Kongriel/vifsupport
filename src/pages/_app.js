import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Breadcrumb from "./components/Breadcrumb";
import Socials from "./components/Socials";

import "@/styles/globals.css";
import "@/styles/task.css";

export default function App({ Component, pageProps }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // Tjek ruter, hvor breadcrumbs ikke skal vises
  const hideBreadcrumbRoutes = ["/tasks/[id]"]; // Tilføj flere ruter her, hvis nødvendigt
  const hideBreadcrumb = hideBreadcrumbRoutes.includes(router.pathname);

  useEffect(() => {
    // Tjek login-status ved første render
    const status = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(status);
  }, []);

  return (
    <>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <div className="ml-16">
        {!hideBreadcrumb && <Breadcrumb />} {/* Skjul Breadcrumb her */}
      </div>
      <main>
        <Component {...pageProps} isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <Socials />
      </main>
      <Footer />
    </>
  );
}
