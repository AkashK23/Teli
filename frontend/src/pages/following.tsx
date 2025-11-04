import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import UserList from "../components/UserList";

export default function Following() {
  const { userId } = useParams<{ userId: string }>();
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const url = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const res = await axios.get(`${url}/users/${userId}/following`);
        const followingIds = res.data.following;

        const followingData = await Promise.all(
          followingIds.map(async (followingId: string) => {
            const userRes = await axios.get(`${url}/user/${followingId}`);
            return userRes.data;
          })
        );

        setFollowing(followingData);
      } catch (err) {
        console.error("Failed to fetch following:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }


  return (
    <div className="following-page">
      <h2 className="following-title">Following</h2>
      <div className="following-container">
        <UserList users={following} />
      </div>
    </div>
  );
}
