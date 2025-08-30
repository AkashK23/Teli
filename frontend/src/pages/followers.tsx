import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Followers() {
  const { userId } = useParams<{ userId: string }>();
  const [followers, setFollowers] = useState<any[]>([]);
  const url = "http://localhost:5001";

  useEffect(() => {
    const fetchFollowers = async () => {
      try {
        const res = await axios.get(`${url}/users/${userId}/followers`);
        const followerIds = res.data.followers;

        const followerData = await Promise.all(
          followerIds.map(async (followersId: string) => {
            const userRes = await axios.get(`${url}/user/${followersId}`);
            console.log(userRes);
            return userRes.data;
          })
        );

        setFollowers(followerData);
      } catch (err) {
        console.error("Failed to fetch following:", err);
      }
    };

    fetchFollowers();
  }, [userId]);

  return (
    <div className="following-page">
      <h2 className="following-title">Following</h2>
      <div className="following-container">
        <ul className="following-list">
          {followers.map((user: any, index: number) => (
            <li key={user.id} className="following-item">
              <a href={`/profile/${user.id}`}>
                <img
                  src={
                    user.picture ||
                    "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"
                  }
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
