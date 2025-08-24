import React, { useState } from "react";
import axios from "axios";
import { useUser } from "../UserContext";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

type GooglePayload = {
  sub: string;
  email: string;
  name: string;
  picture: string;
};

export default function Login() {
  const url = `http://localhost:5001`;
  const { setUserId } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError("No credential received from Google");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Send the Google token to our backend for verification
      const response = await axios.post(`${url}/auth/google`, {
        token: credentialResponse.credential
      });

      if (response.data.user && response.data.user.id) {
        // Set the user ID in context and localStorage
        setUserId(response.data.user.id);
        
        // Navigate to home page
        navigate("/");
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || "Login failed. Please try again.");
      } else {
        setError("Unable to connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login failed. Please try again.");
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>Teli</h1>
        <p style={styles.slogan}>Channel What You Love</p>
        
        <div style={styles.divider} />
        
        <h2 style={styles.subtitle}>Sign in to continue</h2>
        <p style={styles.description}>
          Use your Google account to sign in and start tracking your favorite shows
        </p>

        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        <div style={styles.googleButtonContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <p>Signing in...</p>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="300"
            />
          )}
        </div>

        <p style={styles.privacyNote}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 80px)", // Account for navbar height
    backgroundColor: "#f5f5f5",
    padding: "2rem",
  },
  loginBox: {
    maxWidth: "450px",
    width: "100%",
    padding: "3rem",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    textAlign: "center" as const,
    fontFamily: "Arial, sans-serif",
    background: "#fff",
  },
  title: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
    color: "#333",
    fontWeight: "bold",
  },
  slogan: {
    fontSize: "1.1rem",
    color: "#666",
    marginBottom: "2rem",
    fontStyle: "italic",
  },
  divider: {
    height: "1px",
    backgroundColor: "#e0e0e0",
    margin: "2rem 0",
  },
  subtitle: {
    fontSize: "1.5rem",
    marginBottom: "0.5rem",
    color: "#333",
    fontWeight: "600",
  },
  description: {
    fontSize: "1rem",
    color: "#666",
    marginBottom: "2rem",
    lineHeight: "1.5",
  },
  googleButtonContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "2rem 0",
    minHeight: "50px",
  },
  loadingContainer: {
    padding: "1rem",
    color: "#666",
    fontSize: "1rem",
  },
  errorMessage: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    fontSize: "0.95rem",
    textAlign: "left" as const,
    border: "1px solid #ffcdd2",
  },
  privacyNote: {
    fontSize: "0.85rem",
    color: "#999",
    marginTop: "2rem",
    lineHeight: "1.4",
  },
};
