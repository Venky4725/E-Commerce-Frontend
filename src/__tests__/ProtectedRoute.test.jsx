/**
 * Sample Test File - ProtectedRoute Component
 * Demonstrates: Testing route protection
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../routes/ProtectedRoute";

// Mock the auth store
const mockUseAuthStore = vi.fn();
vi.mock("../store/authStore", () => ({
  default: mockUseAuthStore,
}));

describe("ProtectedRoute Component", () => {
  it("should redirect to login when not authenticated", () => {
    mockUseAuthStore.mockReturnValue({
      token: null,
      user: null,
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should render protected content when authenticated", () => {
    mockUseAuthStore.mockReturnValue({
      token: "fake-token",
      user: { id: 1, username: "testuser" },
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});
