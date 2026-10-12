import React from "react";
import { Link } from "react-router-dom";
import { Home, Search, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-yellow-600/89 mb-2">404</p>
        <h1 className="text-3xl font-bold text-neutral-800 mb-3">
          Page Not Found
        </h1>
        <p className="text-zinc-600 mb-8">
          Looks like this page wandered off the rack. The gown or page you're
          looking for might have been moved, renamed, or doesn't exist.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-yellow-600/89 text-white px-5 py-3 rounded-md font-medium hover:bg-yellow-700/89 transition-colors duration-200 cursor-pointer"
          >
            <Home size={16} />
            Back to Home
          </Link>
          <Link
            to="/catalog"
            className="inline-flex items-center justify-center gap-2 border border-yellow-700/89 text-yellow-700/89 px-5 py-3 rounded-md font-medium hover:bg-yellow-600/89 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            <Search size={16} />
            Browse Catalog
          </Link>
        </div>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-neutral-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Go back to previous page
        </button>
      </div>
    </div>
  );
};

export default NotFound;