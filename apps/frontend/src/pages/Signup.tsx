import { ArrowRight, Check, Lock, Mail, User as UserIcon } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/store";
import { useSignupMutation } from "../features/auth/authApi";
import { setCredentials } from "../features/auth/authSlice";

const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER" | "ADMIN">("TEACHER");
  const [signup, { isLoading }] = useSignupMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted - starting signup process");
    console.log("Data:", { email, password, name, role });
    try {
      console.log("Calling signup mutation...");
      const response = await signup({ email, password, name, role }).unwrap();
      console.log("Signup response:", response);
      dispatch(
        setCredentials({
          user: response.data.user,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        })
      );
      navigate("/dashboard");
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } };
      console.error("Signup error:", err);
      alert(apiError?.data?.message || "Signup failed! Please try again.");
    }
  };

  const features = [
    "Unlimited Assignment Grading",
    "Advanced Analytics Dashboard",
    "Student Portal Access",
    "Email & SMS Notifications",
  ];

  return (
    <div className="w-full h-[calc(100vh-64px)] flex bg-white dark:bg-[#030712] text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Left Side - Visual Feature List */}
      <div className="hidden lg:flex w-1/2 relative bg-gray-50 dark:bg-[#09090b] flex-col justify-center px-12 xl:px-24">
        {/* Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white dark:from-[#030712] via-indigo-50 dark:via-indigo-950/20 to-white dark:to-[#030712]"></div>
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-800 to-transparent"></div>

        <div className="relative z-10 space-y-12">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400 mr-2 animate-pulse"></span>
              Early Access Program
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
              Join the <br />
              <span className="text-indigo-600 dark:text-indigo-500">
                Grading Revolution
              </span>
            </h2>
          </div>

          <div className="space-y-5">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-4 animate-fade-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                </div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 italic">
              "The most intuitive ed-tech platform I've used in 10 years."
            </p>
            <div className="flex mt-4 -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-[#030712] bg-gray-300 dark:bg-gray-600"
                ></div>
              ))}
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-[#030712] bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 font-medium">
                +2k
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative">
        <div className="w-full max-w-sm space-y-8 relative z-10">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Start your 14-day free trial. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1.5 ml-1">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1.5 ml-1">
                Work Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Must be at least 8 chars"
                  className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1.5 ml-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "STUDENT" | "TEACHER" | "ADMIN")
                }
                className="block w-full px-3 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-sm"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/30"
            >
              {isLoading ? "Creating account..." : "Get Started"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>

            <p className="text-xs text-center text-gray-500 mt-4">
              By joining, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
