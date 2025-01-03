import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Breadcrumb from "./Breadcrumb";

export default function Header({ isLoggedIn, setIsLoggedIn, eventSlug }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
    setMenuOpen(false); // Luk menuen ved logout
  };

  return (
    <>
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      <header className=" print:hidden shadow bg-taupe-10 py-4 fixed top-0 left-0 w-full z-50">
        <div className="container mx-auto flex items-center justify-between px-6">
          {/* Logo */}
          <div className="text-3xl font-bold font-bebas text-bono-10 flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/cirkelblue.png"
                alt="VIF cirkel"
                width={70} // Bredde i pixels
                height={70} // Højde i pixels
                className="w-18 h-18"
              />
              <span className=" font-bebas px-6 -mb-2 text-2xl"> VIF Supportere</span>
            </Link>
          </div>

          {/* Hamburger Menu */}
          <div className="md:hidden">
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-600  focus:outline-none" aria-label="Menu">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7"></path>
              </svg>
            </button>
          </div>

          {/* Navigation for desktop */}
          <nav className="hidden md:flex space-x-6">
            <Link href="/event" className="relative text-bono-10 font-montserrat font-semibold transition-all duration-200 before:content-[''] before:absolute before:bottom-2 before:left-0 before:h-[2px] before:w-0 before:bg-gray-700 hover:before:w-full before:transition-all before:duration-250">
              Events
            </Link>
            <Link href="/about" className="relative text-bono-10 font-montserrat font-semibold transition-all duration-200 before:content-[''] before:absolute before:bottom-2 before:left-0 before:h-[2px] before:w-0 before:bg-gray-700 hover:before:w-full before:transition-all before:duration-250">
              Om Os
            </Link>

            {isLoggedIn && (
              <Link href="/admin" className="relative text-bono-10 font-montserrat font-semibold transition-all duration-200 before:content-[''] before:absolute before:bottom-2 before:left-0 before:h-[2px] before:w-0 before:bg-gray-700 hover:before:w-full before:transition-all before:duration-250">
                Admin
              </Link>
            )}

            {isLoggedIn ? (
              <Link href="/">
                <button onClick={handleLogout} className="relative  text-bono-10 font-montserrat font-semibold px-2 py-2 text-sm  -mt-3 rounded  flex items-center group" aria-label="log ud">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                    <path d="M8 13H16M8 13V18C8 19.8856 8 20.8284 8.58579 21.4142C9.17157 22 10.1144 22 12 22C13.8856 22 14.8284 22 15.4142 21.4142C16 20.8284 16 19.8856 16 18V13M8 13C5.2421 12.3871 3.06717 10.2687 2.38197 7.52787L2 6M16 13C17.7107 13 19.1506 14.2804 19.3505 15.9795L20 21.5" stroke="#36454D" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="6" r="4" stroke="#36454D" strokeWidth="2" />
                  </svg>
                  {/* Tooltip */}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-1 text-xs text-white bg-gray-800 px-2 py-1 rounded opacity-0 whitespace-nowrap transition-opacity duration-200 group-hover:opacity-100">Log ud</span>
                </button>
              </Link>
            ) : (
              <Link href="/login">
                <button className="relative  text-bono-10 font-montserrat font-semibold px-2  py-2 text-sm  -mt-3 rounded  flex items-center group" aria-label="login">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                    <circle cx="12" cy="9" r="3" stroke="#36454D" strokeWidth="2" />
                    <circle cx="12" cy="12" r="10" stroke="#36454D" strokeWidth="2" />
                    <path d="M17.9691 20C17.81 17.1085 16.9247 15 11.9999 15C7.07521 15 6.18991 17.1085 6.03076 20" stroke="#36454D" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {/* Tooltip */}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-1 text-xs text-white bg-gray-800 px-2 py-1 rounded opacity-0 transition-opacity duration-200 group-hover:opacity-100">Login</span>
                </button>
              </Link>
            )}
          </nav>
        </div>

        {/* Mobile Menu */}
        {menuOpen && <div className="fixed inset-0 bg-black bg-opacity-70 z-40" onClick={() => setMenuOpen(false)}></div>}
        <div className={`fixed top-0 right-0 h-full w-full bg-gray-600 shadow-md z-50 transform transition-transform duration-300 ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex flex-col h-full">
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-blue-500 focus:outline-none" aria-label="menu">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col items-center space-y-4 py-7 px-6">
              <Link href="/event" className="text-taupe-10 py-1 text-4xl" onClick={() => setMenuOpen(false)}>
                Events
              </Link>
              <Link href="/about" className="text-taupe-10 py-1 text-4xl" onClick={() => setMenuOpen(false)}>
                Om os
              </Link>
              {isLoggedIn && (
                <Link href="/admin" className="text-taupe-10 py-1 text-4xl" onClick={() => setMenuOpen(false)}>
                  Admin
                </Link>
              )}
            </nav>

            {/* Login/Logout button */}
            <div className="mt-auto px-6 pb-6">
              {isLoggedIn ? (
                <button onClick={handleLogout} className=" text-taupe-10 text-4xl px-4 py-2 rounded  w-full" aria-label="log ud">
                  Log ud
                </button>
              ) : (
                <Link href="/login">
                  <button onClick={() => setMenuOpen(false)} className=" text-taupe-10 text-4xl px-4 py-2 rounded w-full" aria-label="login">
                    Login
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
