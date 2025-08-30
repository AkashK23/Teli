import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Following() {
  const { userId } = useParams<{ userId: string }>();
  const [following, setFollowing] = useState<any[]>([]);
  const url = "http://localhost:5001";

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        // 1. Get list of following IDs
        const res = await axios.get(`${url}/users/${userId}/following`);
        const followingIds = res.data.following;

        // 2. Fetch info for each following user
        const followingData = await Promise.all(
          followingIds.map(async (followingId: string) => {
            const userRes = await axios.get(`${url}/user/${followingId}`);
            console.log(userRes)
            return userRes.data;
          })
        );

        setFollowing(followingData);
      } catch (err) {
        console.error("Failed to fetch following:", err);
      }
    };

    fetchFollowing();
  }, [userId]);

  return (
    <div className="following-page">
      <h2 className="following-title">Following</h2>
      <div className="following-container">
        <ul className="following-list">
          {following.map((user: any, index: number) => (
            <li key={user.id} className="following-item">
              <a href={`/profile/${user.id}`}>
                <img
                  src={user.picture || "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"}
                  alt={user.name}
                  className="following-avatar"
                />
                <span className="following-name">{user.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
