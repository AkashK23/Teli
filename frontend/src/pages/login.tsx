import { useState } from "react";
import axios from "axios";
import { useUser } from "../UserContext";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const url = process.env.REACT_APP_API_URL;
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
      console.log(response)

      if (response.data.user && response.data.user.id) {
        setUserId(response.data.user.id);

        if (response.data.message == "User created successfully") {
          navigate("/onboarding");
        } else {
          navigate("/");
        }
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
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">Teli</h1>
        <p className="login-slogan">Channel What You Love</p>
        
        <div className="login-divider" />
        
        <h2 className="login-subtitle">Sign in to continue</h2>
        <p className="login-description">
          Use your Google account to sign in and start tracking your favorite shows
        </p>

        {error && (
          <div className="login-error-message">
            {error}
          </div>
        )}

        <div className="login-google-button-container">
          {loading ? (
            <div className="login-loading-container">
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

        <p className="login-privacy-note">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}