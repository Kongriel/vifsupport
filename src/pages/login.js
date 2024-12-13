import { useState } from "react";
import { useRouter } from "next/router";

export default function Login({ setIsLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();

    // Simuler login
    if (email === "admin@vif.dk" && password === "123456") {
      localStorage.setItem("isLoggedIn", "true"); // Gem login-status
      setIsLoggedIn(true); // Opdater React state
      router.push("/admin"); // Omdiriger til admin-siden
    } else {
      setError("Forkert email eller adgangskode.");
    }
  };

  return (
    <div className="p-8 min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className=" bg-knap-10  p-6 rounded-xl shadow-lg border border-gray-600 md:w-4/12 mx-auto">
        <h1 className="text-3xl font-bebas text-bono-10 text-center mb-8">Log ind som Admin!</h1>

        {/* Email Input */}
        <div className="relative mb-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-8 py-5 bg-knap-10 border text-bono-10 border-gray-600 rounded-xl placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="E-mail*" onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} required />
          <label className={`absolute left-4 top-4 text-bono-10 transition-all duration-200 ${emailFocused || email ? "transform -translate-y-3 scale-75" : ""}`} style={{ color: "#36454D" }}>
            E-mail
          </label>
        </div>

        {/* Password Input */}
        <div className="relative mb-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-8 py-5 bg-knap-10 border text-bono-10 border-gray-600 rounded-xl placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Adgangskode*" onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} required />
          <label className={`absolute left-4 top-4 text-bono-10 transition-all duration-200 ${passwordFocused || password ? "transform -translate-y-3 scale-75" : ""}`} style={{ color: "#36454D" }}>
            Adgangskode
          </label>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Submit Button */}
        <button type="submit" className="w-full px-8 py-8 tracking-wider font-bebas text-xl bg-knap-10 border border-gray-600 hover:border-blue-700 text-bono-10 font-bold rounded-xl cursor-pointer">
          Log Ind
        </button>
      </form>
    </div>
  );
}
