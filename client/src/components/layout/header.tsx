import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-code text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">CodeReview AI</h1>
              <p className="text-xs text-slate-500">Advanced Code Analysis</p>
            </div>
          </div>

          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-slate-600 hover:text-slate-900 font-medium">Dashboard</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 font-medium">History</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 font-medium">Settings</a>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-soft"></div>
              <span>AI Ready</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <i className="fas fa-bars text-lg"></i>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}