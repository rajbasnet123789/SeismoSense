import React, { useState } from "react";
import Number from "./Number.jsx";

function Login() {
  const [showNumber, setShowNumber] = useState(false);

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">


      <div className="absolute inset-0 bg-gradient-to-br from-[#3b2f2f] via-[#4a3728] to-[#1f140f] blur-2xl scale-110"></div>

      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-[#2b1d14] to-[#1a120d] border border-[#5a3e2b] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8">

        {!showOTP ? (
          <>
            <h2 className="text-3xl font-bold text-[#d6b38c] text-center mb-6 tracking-wide">
              Login
            </h2>

            <button
              onClick={() => setShowNumber(true)}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#6b4423] to-[#8b5a2b] text-[#f5e6d3] font-semibold tracking-wide hover:brightness-110 active:scale-[0.98] transition"
            >
              Continue with Phone Number
            </button>

            <footer className="mt-8 text-center text-sm text-[#9c7a5a]">
              © All rights reserved
            </footer>
          </>
        ) : (
          <Number />
        )}

      </div>
    </div>
  );
}

export default Login;
