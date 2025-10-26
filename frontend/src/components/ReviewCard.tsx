import React from "react";
import { useNavigate } from "react-router-dom";

interface ReviewCardProps {
  showId: string;
  userId: string;
  userName: string;
  userProfilePic?: string;
  comment?: string;
  rating?: number;
  showImageUrl?: string;
  showName?: string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  showId,
  userId,
  userName,
  userProfilePic,
  comment,
  rating,
  showImageUrl,
  showName,
}) => {
  const navigate = useNavigate();
  const profilePic =
    (userProfilePic ? userProfilePic.slice(0, -4) + "1080" : null) ||
    "/avatar.jpg";

const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    navigate(`/profile/${userId}`);
};

const goToShow = () => {
    navigate(`/show/${encodeURIComponent(showId)}`);
};

  return (
    <div className="rating-card" key={showId} onClick={goToShow}>
      <img
        src={profilePic}
        className="profile-avatar-home"
        alt={`${userName}'s profile`}
        onClick={goToProfile}
      />

      <div className="rating-details">
        <div className="rating-text">
          <div onClick={goToProfile}>
            <h4>{userName}</h4>
          </div>
          <p>{comment}</p>
        </div>
        <div className="rating-score">{rating}</div>
      </div>

      {showImageUrl && (
        <img
          src={showImageUrl}
          alt={showName || "Show poster"}
          className="rating-show-img"
        />
      )}
    </div>
  );
};

export default ReviewCard;
