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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [signupData, setSignupData] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    bio: "",
  });

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSignupChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.get(`${url}/user/${loginData.username}`);
      console.log(res);
      const id = res.data.id;
      setUserId(id);
      navigate("/");
      // localStorage.setItem("user_id", res.data.user_id);
      // alert("Login successful!");
      // Optionally redirect here
    } catch (err) {
      console.error(err);
      alert("Login failed.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5001/auth/signup",
        signupData
      );
      localStorage.setItem("user_id", res.data.user_id);
      alert("Sign up successful!");
      // Optionally redirect here
    } catch (err) {
      console.error(err);
      alert("Sign up failed.");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Teli</h1>
      <p style={styles.slogan}>Channel What You Love</p>

      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "login" ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab("login")}
        >
          Login
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "signup" ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab("signup")}
        >
          Sign Up
        </button>
      </div>

      <form
        onSubmit={activeTab === "login" ? handleLogin : handleSignup}
        style={styles.form}
      >
        {activeTab === "login" ? (
          <>
            <input
              name="username"
              placeholder="Username"
              value={loginData.username}
              onChange={handleLoginChange}
              required
              style={styles.input}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={loginData.password}
              onChange={handleLoginChange}
              required
              style={styles.input}
            />
          </>
        ) : (
          <>
            <input
              name="name"
              placeholder="Name"
              value={signupData.name}
              onChange={handleSignupChange}
              required
              style={styles.input}
            />
            <input
              name="username"
              placeholder="Username"
              value={signupData.username}
              onChange={handleSignupChange}
              required
              style={styles.input}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={signupData.password}
              onChange={handleSignupChange}
              required
              style={styles.input}
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={signupData.email}
              onChange={handleSignupChange}
              required
              style={styles.input}
            />
            <textarea
              name="bio"
              placeholder="Bio"
              value={signupData.bio}
              onChange={handleSignupChange}
              style={{ ...styles.input, height: "60px" }}
            />
          </>
        )}
        <button type="submit" style={styles.submitButton}>
          {activeTab === "login" ? "Login" : "Sign Up"}
        </button>
      </form>

      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            const decoded: GooglePayload = jwtDecode<GooglePayload>(
              credentialResponse.credential as string
            );
            console.log(decoded)


            // Use Google’s sub (unique id) as your user_id
            setUserId(decoded.sub);
            navigate("/");

            // Optional: send token to your backend for verification & user creation
            // fetch("http://localhost:5001/auth/google", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({
            //     token: credentialResponse.credential,
            //   }),
            // });
          }
        }}
        onError={() => {
          console.log("Google Login Failed");
        }}
      />
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "400px",
    margin: "4rem auto",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    textAlign: "center" as const,
    fontFamily: "Arial, sans-serif",
    background: "#fff",
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "0.25rem",
  },
  slogan: {
    fontSize: "1rem",
    color: "#666",
    marginBottom: "1.5rem",
  },
  tabContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  tab: {
    flex: 1,
    padding: "0.75rem",
    border: "1px solid #ccc",
    backgroundColor: "#f5f5f5",
    cursor: "pointer",
    fontWeight: 600,
  },
  activeTab: {
    backgroundColor: "#333",
    color: "white",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
  },
  input: {
    padding: "0.75rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  submitButton: {
    padding: "0.75rem",
    backgroundColor: "#333",
    color: "white",
    fontWeight: "bold",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginBottom: "1rem",
  },
};
  