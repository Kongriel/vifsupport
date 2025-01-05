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

  const hideBreadcrumbRoutes = ["/tasks/[id]"];
  const hideBreadcrumb = hideBreadcrumbRoutes.includes(router.pathname);

  const isHomePage = router.pathname === "/";

  useEffect(() => {
    const status = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(status);
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      {/* Mobil version: Tilbage-pil */}
      {!isHomePage && (
        <div className="md:hidden mt-28 -mb-16 p-4">
          {!hideBreadcrumb && (
            <button onClick={handleBack} className="flex items-center space-x-2 text-black hover:text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Tilbage</span>
            </button>
          )}
        </div>
      )}

      {/* Desktop version: Breadcrumb */}
      <div className="ml-16 hidden md:block">{!hideBreadcrumb && <Breadcrumb />}</div>

      <main>
        <Component {...pageProps} isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <Socials />
      </main>
      <Footer />
    </>
  );
}
