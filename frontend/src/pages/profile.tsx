import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { useUser } from "../UserContext";

export default function Profile() {
  const url = `http://localhost:5001`;
  const { id } = useParams<{ id?: string }>(); // <-- optional param
  const loggedInUserId = useUser().userId;

  const user_id = id || loggedInUserId;

  const [userInfo, setUserInfo] = useState<any>(null);
  const [following, setFollowing] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [ratings, setRatings] = useState<any[]>([]);
  const [ratingsWithImages, setRatingsWithImages] = useState<any[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<any[]>([]);
  const [currentlyWatchingWithImages, setCurrentlyWatchingWithImages] =
    useState<any[]>([]);
  const [loading, setLoading] = useState(true); // single loading state

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Fetch user info
        const userRes = await axios.get(`${url}/user/${user_id}`);
        console.log(userRes)
        setUserInfo(userRes.data);

        // Fetch followers/following
        const followingRes = await axios.get(
          `${url}/users/${user_id}/following`
        );
        setFollowing(followingRes.data.following.length);

        const followersRes = await axios.get(
          `${url}/users/${user_id}/followers`
        );
        setFollowers(followersRes.data.followers.length);

        // Fetch ratings
        const ratingsRes = await axios.get(`${url}/users/${user_id}/ratings`);
        setRatings(ratingsRes.data);

        // Fetch currently watching
        const currentlyWatchingRes = await axios.get(
          `${url}/users/${user_id}/currently_watching`
        );
        setCurrentlyWatching(currentlyWatchingRes.data);

        // Fetch images for ratings
        const ratingsWithImagesRes = await Promise.all(
          ratingsRes.data.map(async (rating: any) => {
            try {
              const showRes = await axios.get(`${url}/shows/${rating.show_id}`);
              const showData = showRes.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              return {
                ...rating,
                image_url:
                  showData?.image_url || showData?.thumbnail || imageUrl,
              };
            } catch {
              return { ...rating, image_url: null };
            }
          })
        );
        setRatingsWithImages(ratingsWithImagesRes);

        // Fetch images for currently watching
        const currentlyWatchingWithImagesRes = await Promise.all(
          currentlyWatchingRes.data.map(async (show: any) => {
            try {
              const showRes = await axios.get(`${url}/shows/${show.show_id}`);
              const showData = showRes.data;
              const imagePath = showData.poster_path;
              const imageUrl = imagePath?.startsWith("http")
                ? imagePath
                : `https://image.tmdb.org/t/p/w500${imagePath}`;
              return {
                ...show,
                image_url:
                  showData?.image_url || showData?.thumbnail || imageUrl,
                name: showData.name || show.show_name,
              };
            } catch {
              return { ...show, image_url: null };
            }
          })
        );
        setCurrentlyWatchingWithImages(currentlyWatchingWithImagesRes);
      } catch (err) {
        console.error("Failed to fetch profile data:", err);
      } finally {
        setLoading(false); // everything loaded
      }
    };

    fetchProfileData();
  }, [user_id]);

  if (loading) return <div>Loading profile...</div>; // wait until all data is ready

  return (
    <div>
      {/* Profile Header + Bio */}
      <div className="profile-header-section">
        <div className="profile-header">
          <div className="profile-pic">
            <img
              src={userInfo.picture || "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"}
              referrerPolicy="no-referrer"
              className="profile-avatar"
            />
            <h4 className="username">
              <b>{userInfo.name}</b>
            </h4>
          </div>
          <div className="profile-stats">
            <div className="stat">
              <div className="stat-number">
                <b>{ratings.length}</b>
              </div>
              <div className="stat-label">Shows</div>
            </div>
            <Link to={`/users/${user_id}/following`} className="stat-link">
              <div className="stat">
                <div className="stat-number">
                  <b>{following}</b>
                </div>
                <div className="stat-label">Following</div>
              </div>
            </Link>
            <Link to={`/users/${user_id}/followers`} className="stat-link">
              <div className="stat">
                <div className="stat-number">
                  <b>{followers}</b>
                </div>
                <div className="stat-label">Followers</div>
              </div>
            </Link>
          </div>
        </div>

        {userInfo.bio && (
          <div className="profile-bio">
            <p className="bio-content">{userInfo.bio}</p>
          </div>
        )}
      </div>

      {/* Currently Watching */}
      <div className="favorite-shows">
        <h3 className="shows-label">Currently Watching</h3>
        <div className="favorite-shows-images">
          {currentlyWatchingWithImages.map((show) => (
            <Link
              to={`/show/${show.show_id}`}
              key={show.show_id}
              className="show-link"
            >
              <img
                src={show.image_url}
                alt={show.name}
                className="show-icon small-icon"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="favorite-shows">
        <h3 className="shows-label">Recent Reviews</h3>
        <div className="user-ratings">
          <div className="rating-cards-container">
            {ratingsWithImages.map((rating: any) => (
              <div className="rating-card" key={rating.show_id}>
                <img
                  src={rating.image_url}
                  alt={rating.name}
                  className="rating-show-img"
                />
                <div className="rating-details">
                  <div className="rating-score">{rating.rating}</div>
                  <div className="rating-text">
                    <p>{rating.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
