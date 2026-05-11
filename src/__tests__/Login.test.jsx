/**
 * Sample Test File - Login Component
 * Demonstrates: Testing readiness with Vitest + React Testing Library
 * 
 * To run tests:
 * 1. Install dependencies: npm install -D vitest @testing-library/react @testing-library/jest-dom
 * 2. Add to package.json: "test": "vitest"
 * 3. Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Login from "../pages/Login";

// Mock the API
vi.mock("../api/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock the auth store
vi.mock("../store/authStore", () => ({
  default: vi.fn(() => ({
    setAuth: vi.fn(),
  })),
}));

describe("Login Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render login form", () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("should show validation errors for empty fields", async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("should call API on form submission with valid data", async () => {
    const mockPost = vi.fn().mockResolvedValue({
      data: { access_token: "fake-token" },
    });

    vi.mocked(api.post).mockImplementation(mockPost);

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/login",
        expect.any(FormData)
      );
    });
  });
});
