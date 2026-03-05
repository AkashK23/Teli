import { useParams } from "react-router-dom";
import UserList from "../components/UserList";
import { useFollowingProfiles } from "../hooks/useUser";

export default function Following() {
  const { userId } = useParams<{ userId: string }>();
  const { data: following, isLoading } = useFollowingProfiles(userId);

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
      <h2 className="following-title">Following</h2>
      <div className="following-container">
        <UserList users={following} />
      </div>
    </div>
  );
}
