import { useState } from "react";
import Link from "next/link";

export default function Header({ isLoggedIn, setIsLoggedIn }) {
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
      <header className=" print:hidden shadow bg-taupe-10 py-5 fixed top-0 left-0 w-full z-50">
        <div className="container mx-auto flex items-center justify-between px-6">
          {/* Logo */}
          <div className="text-3xl font-bold font-bebas text-bono-10">
            <Link href="/">VIF Support</Link>
          </div>

          {/* Hamburger Menu */}
          <div className="md:hidden">
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-600 hover:text-blue-500 focus:outline-none">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7"></path>
              </svg>
            </button>
          </div>

          {/* Navigation for desktop */}
          <nav className="hidden  md:flex space-x-6">
            <Link href="/event" className="relative text-bono-10 font-montserrat font-semibold  transition-all duration-200 before:content-[''] before:absolute before:bottom-2 before:left-0 before:h-[2px] before:w-0 before:bg-gray-700 hover:before:w-full before:transition-all before:duration-300">
              Events
            </Link>
            <Link href="/about" className="relative text-bono-10 font-montserrat font-semibold  transition-all duration-200 before:content-[''] before:absolute before:bottom-2 before:left-0 before:h-[2px] before:w-0 before:bg-gray-700 hover:before:w-full before:transition-all before:duration-300">
              Om os
            </Link>
            <Link href="/admin" className="relative text-bono-10 font-montserrat font-semibold  transition-all duration-200 before:content-[''] before:absolute before:bottom-2 before:left-0 before:h-[2px] before:w-0 before:bg-gray-700 hover:before:w-full before:transition-all before:duration-300">
              Admin
            </Link>

            {isLoggedIn ? (
              <Link className="" href="/">
                <button onClick={handleLogout} className="bg-red-500 border border-gray-300 text-white px-4 py-2 -mt-2 rounded hover:bg-red-600">
                  Log ud
                </button>
              </Link>
            ) : (
              <Link href="/login">
                <button className="bg-knap-10 text-bono-10 font-montserrat font-semibold px-5 border border-gray-500 py-2 text-sm hover:border-blue-600 -mt-2 rounded hover:bg-taupe-10">Login</button>
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
              <button onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-blue-500 focus:outline-none">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col items-center space-y-4 py-7 px-6">
              <Link href="/tasks" className="text-gray-300 py-1 text-4xl hover:text-blue-500" onClick={() => setMenuOpen(false)}>
                Opgaver
              </Link>
              <Link href="/about" className="text-gray-300 py-1 text-4xl hover:text-blue-500" onClick={() => setMenuOpen(false)}>
                Om os
              </Link>
              <Link href="/admin" className="text-gray-300 py-1 text-4xl hover:text-blue-500" onClick={() => setMenuOpen(false)}>
                Admin
              </Link>
            </nav>

            {/* Login/Logout button */}
            <div className="mt-auto px-6 pb-6">
              {isLoggedIn ? (
                <button onClick={handleLogout} className="bg-knap-10 text-bono-10 px-4 py-2 rounded hover:bg-red-600 w-full">
                  Log ud
                </button>
              ) : (
                <Link href="/login">
                  <button onClick={() => setMenuOpen(false)} className="bg-knap-10 text-bono-10 px-4 py-2 rounded hover:bg-blue-600 w-full">
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
