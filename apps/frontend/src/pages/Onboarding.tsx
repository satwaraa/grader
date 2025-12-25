import { ArrowRight, CheckCircle2, PlayCircle, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Custom Typewriter Hook with Types
const useTypewriter = (
  textArray: string[],
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseTime = 2000
) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeedState, setTypingSpeedState] = useState(typingSpeed);

  useEffect(() => {
    const i = loopNum % textArray.length;
    const fullText = textArray[i];

    const handleType = () => {
      setDisplayedText((prev) =>
        isDeleting
          ? fullText.substring(0, prev.length - 1)
          : fullText.substring(0, prev.length + 1)
      );

      setTypingSpeedState(isDeleting ? deletingSpeed : typingSpeed);

      if (!isDeleting && displayedText === fullText) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && displayedText === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleType, typingSpeedState);
    return () => clearTimeout(timer);
  }, [
    displayedText,
    isDeleting,
    loopNum,
    textArray,
    typingSpeed,
    deletingSpeed,
    pauseTime,
    typingSpeedState,
  ]);

  return displayedText;
};

const Onboarding: React.FC = () => {
  const slogans = [
    "just got intelligent.",
    "is finally automated.",
    "takes zero effort.",
    "powered by AI.",
  ];

  const typingText = useTypewriter(slogans);

  return (
    // Fixed height h-[calc(100vh-64px)] accounts for the 64px navbar
    <div className="relative h-[calc(100vh-64px)] w-full bg-white dark:bg-[#030712] text-gray-900 dark:text-white overflow-hidden font-sans selection:bg-indigo-500 selection:text-white flex items-center justify-center transition-colors duration-300">
      {/* --- Ambient Background --- */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-200/40 dark:bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-200/40 dark:bg-purple-900/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen"></div>

      {/* --- Main Content --- */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-center flex flex-col items-center">
        {/* New Feature Badge */}
        <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm animate-fade-in transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/20 cursor-default">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400 animate-pulse" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-200 tracking-wide">
            AI-Grading V2.0 is live
          </span>
        </div>

        {/* Dynamic Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]">
          Grading papers <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-400 animate-gradient-x">
            {typingText}
          </span>
          <span className="animate-blink text-indigo-600 dark:text-indigo-400 ml-1">
            |
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed font-light">
          Your weekend is back. Our dashboard auto-grades assignments, analyzes
          student performance, and synchronizes scores instantly.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            to="/signup"
            className="group relative inline-flex h-14 w-full sm:w-48 items-center justify-center overflow-hidden rounded-xl bg-indigo-600 font-medium text-white transition-all duration-300 hover:bg-indigo-700 hover:scale-105 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]"
          >
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-[100%] transition-transform duration-700 -translate-x-[100%] skew-x-12" />
            <span className="mr-2">Get Started</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            to="/login"
            className="group inline-flex h-14 w-full sm:w-48 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-200 transition-all duration-300 hover:bg-white/10 hover:text-white backdrop-blur-sm"
          >
            <PlayCircle className="mr-2 h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
            See Demo
          </Link>
        </div>

        {/* Footer Features */}
        <div className="mt-16 flex items-center justify-center gap-x-8 gap-y-4 flex-wrap opacity-60 hover:opacity-100 transition-opacity duration-500">
          {["Instant Feedback", "99.9% Accuracy", "Analytics Ready"].map(
            (feature) => (
              <div
                key={feature}
                className="flex items-center space-x-2 text-sm font-medium text-gray-300"
              >
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                <span>{feature}</span>
              </div>
            )
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-blink { animation: blink 1s step-end infinite; }
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
