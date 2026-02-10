import React, { useRef, useState } from "react";

function OTP() {
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const inputsRef = useRef([]);

  const handleChange = (value, index) => {
    if (!/^[0-9a-zA-Z]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 4) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#3b2f2f] to-[#1f140f]">

      <div className="w-full max-w-md bg-gradient-to-br from-[#2b1d14] to-[#1a120d] border border-[#5a3e2b] rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">

        <h2 className="text-2xl font-bold text-[#d6b38c] text-center mb-6 tracking-wide">
          Enter OTP
        </h2>

        <div className="flex justify-between gap-3 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-12 h-14 text-center text-xl font-bold text-[#f5e6d3] bg-[#1a120d] border border-[#6b4423] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] transition"
            />
          ))}
        </div>

        <button
          onClick={() => alert(`OTP Entered: ${otp.join("")}`)}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-[#6b4423] to-[#8b5a2b] text-[#f5e6d3] font-semibold tracking-wide hover:brightness-110 active:scale-[0.98] transition"
        >
          Verify OTP
        </button>

      </div>
    </div>
  );
}

export default OTP;
