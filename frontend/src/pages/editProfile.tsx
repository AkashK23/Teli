import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";

export default function EditProfile() {
  const { userId } = useUser();
  const navigate = useNavigate();
  const url = process.env.REACT_APP_API_URL;

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [picture, setPicture] = useState("");
  const [bio, setBio] = useState("");

  // Fetch existing user info to prepopulate
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${url}/user/${userId}`);
        if (res.data) {
          setName(res.data.name || "");
          setUsername(res.data.username || "");
          setEmail(res.data.email || "");
          setPicture(res.data.picture || "");
          setBio(res.data.bio || "");
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };
    if (userId) fetchUser();
  }, [userId]);

  const handleSubmit = async () => {
    try {
      await axios.put(`${url}/user/${userId}/profile`, {
        username,
        email,
        name,
        bio,
        picture,
      });
      navigate(`/profile`);
    } catch (err) {
      console.error("Failed to save onboarding:", err);
    }
  };

  const handleCancel = () => {
    navigate(`/profile`);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your profile? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${url}/user/${userId}`);
      alert("Your profile has been deleted.");
      navigate(`/login`);
    } catch (err) {
      console.error("Failed to delete profile:", err);
      alert("An error occurred while deleting your profile. Please try again.");
    }
  };

  return (
    <div className="onboarding-container">
      <h1 className="onboarding-title">Edit Profile</h1>

      <div className="onboarding-form">
        {/* Name */}
        <div className="onboarding-field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Username */}
        <div className="onboarding-field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="onboarding-field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {/* Bio */}
        <div className="onboarding-field">
          <label>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>

        <button className="onboarding-submit" onClick={handleSubmit}>
          Update
        </button>

        <button className="onboarding-cancel" onClick={handleCancel}>
          Cancel
        </button>

        <button className="onboarding-delete" onClick={handleDelete}>
          Delete Profile
        </button>
      </div>
    </div>
  );
}
