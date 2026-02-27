import { useParams } from "react-router-dom";
import UserList from "../components/UserList";
import { useFollowerProfiles } from "../hooks/useUser";

export default function Followers() {
  const { userId } = useParams<{ userId: string }>();
  const { data: followers, isLoading } = useFollowerProfiles(userId);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="following-page">
      <h2 className="following-title">Followers</h2>
      <div className="following-container">
        <UserList users={followers} />
      </div>
    </div>
  );
}
