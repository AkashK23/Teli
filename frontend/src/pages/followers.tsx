import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import UserList from "../components/UserList";

export default function Followers() {
  const { userId } = useParams<{ userId: string }>();
  const [followers, setFollowers] = useState<any[]>([]);
  const url = process.env.REACT_APP_API_URL;

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
      <h2 className="following-title">Followers</h2>
      <div className="following-container">
        <UserList users={followers} />
      </div>
    </div>
  );
}
