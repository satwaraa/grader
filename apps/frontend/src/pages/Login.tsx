import { ArrowRight, Github, LayoutDashboard, Lock, Mail } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/store";
import { useLoginMutation } from "../features/auth/authApi";
import { setCredentials } from "../features/auth/authSlice";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login({ email, password }).unwrap();
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
      console.error("Login error:", err);
      alert(
        apiError?.data?.message || "Login failed! Please check your credentials."
      );
    }
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] flex bg-white dark:bg-[#030712] text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Left Side - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative z-10">
        {/* Subtle background glow for the form side */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-indigo-100/40 dark:from-indigo-900/10 via-transparent to-transparent pointer-events-none"></div>

        <div className="w-full max-w-sm space-y-8 animate-fade-in-up">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Please enter your details to sign in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1.5 ml-1">
                Email
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
                  className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-xs font-medium uppercase text-gray-500">
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-sm hover:border-gray-300 dark:hover:border-gray-700"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all hover:scale-[1.02] shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)]"
            >
              {isLoading ? (
                <span className="animate-pulse">Signing in...</span>
              ) : (
                <span className="flex items-center">
                  Sign In{" "}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-[#030712] text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <Github className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">GitHub</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <LayoutDashboard className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">SSO</span>
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Artistic Panel */}
      <div className="hidden lg:flex w-1/2 bg-gray-50 dark:bg-gray-900 relative justify-center items-center overflow-hidden">
        {/* Abstract Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 dark:from-indigo-600/20 via-white dark:via-[#030712] to-purple-100/50 dark:to-purple-900/40"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

        {/* Animated Orbs */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-600/30 rounded-full blur-[128px] animate-pulse"></div>
        <div
          className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[96px] animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>

        {/* Content Floating on top */}
        <div className="relative z-10 max-w-lg text-center px-6">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            "This tool saves me{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              15 hours
            </span>{" "}
            every single week."
          </h3>
          <div className="flex items-center justify-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border border-gray-300 dark:border-gray-500 flex items-center justify-center font-bold text-lg text-gray-700 dark:text-white">
              AS
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">
                Prof. Albus Severus
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Head of Data Science
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
