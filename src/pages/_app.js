import { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Socials from "./components/Socials";

import "@/styles/globals.css";
import "@/styles/task.css";

export default function App({ Component, pageProps }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Tjek login-status ved første render
    const status = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(status);
  }, []);

  return (
    <>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <Component {...pageProps} isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <Socials />
      <Footer />
    </>
  );
}
