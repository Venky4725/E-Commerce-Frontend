import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

/**
 * Main Layout Component
 * Demonstrates: Component composition, children prop, Outlet
 * Use case: Consistent layout across pages
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 transition-colors duration-200">
      <Navbar />
      <main className="pb-8">
        {/* Outlet renders nested routes, children for direct usage */}
        {children || <Outlet />}
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-3">ShopKart</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your one-stop shop for all your needs. Quality products, fast delivery.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>About Us</li>
                <li>Contact</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-3">Contact</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Email: support@shopkart.com<br />
                Phone: +91 1234567890
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-600 dark:text-gray-400">
            © 2024 ShopKart. All rights reserved. Built with React + FastAPI.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
