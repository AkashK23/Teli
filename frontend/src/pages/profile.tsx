import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";


  
export default function Profile() {
  const [favoriteShows, setFavoriteShows] = useState<any[]>([]);

  const favoriteNames = ["Breaking Bad", "Game of Thrones", "Friends", "The Office"];
  const [userInfo, setUserInfo] = useState<any>(null);
  const [following, setFollowing] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [ratingsWithImages, setRatingsWithImages] = useState<any[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<any[]>([]);
  const [currentlyWatchingWithImages, setCurrentlyWatchingWithImages] = useState<any[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5001/user/Gem55qTyh44NPdFwWZgw`);
        // console.log(res.data);
        setUserInfo(res.data);

        const following_backend = await axios.get(`http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/following`);
        // console.log(following_backend.data.following.length);
        setFollowing(following_backend.data.following.length);

        const followers_backend = await axios.get(`http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/followers`);
        // console.log(followers_backend.data.followers.length);
        setFollowers(followers_backend.data.followers.length);

        const ratings_backend = await axios.get(`http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/ratings`);
        setRatings(ratings_backend.data);
        console.log(ratings_backend)

        const currently_watching_backend = await axios.get(`http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/currently_watching`);
        // console.log("Currently Watching: ", currently_watching_backend.data);
        setCurrentlyWatching(currently_watching_backend.data);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };
  
    fetchData();
  }, []); // <== empty array here
  

  useEffect(() => {
    const fetchImagesForRatings = async () => {
      const updatedRatings = await Promise.all(ratings.map(async (rating) => {
        try {
          console.log("Ratings:", ratings)
          const res = await axios.get(`http://localhost:5001/shows/${rating.show_id}`);
          const showData = res.data;
          const imagePath = showData.poster_path;
          const imageUrl = imagePath?.startsWith("http")
            ? imagePath
            : `https://image.tmdb.org/t/p/w500${imagePath}`;
          return {
            ...rating,
            image_url: showData?.image_url || showData?.thumbnail || imageUrl || null
          };
        } catch (err) {
          console.error("Failed to fetch image for:", rating.show_name);
          return { ...rating, image_url: null };
        }
      }));
  
      setRatingsWithImages(updatedRatings);
    };
  
    if (ratings.length > 0) {
      fetchImagesForRatings();
    }
  }, [ratings]);

  useEffect(() => {
  const fetchImagesForCurrentlyWatching = async () => {
    const updatedShows = await Promise.all(currentlyWatching.map(async (show: any) => {
      try {
        const res = await axios.get(`http://localhost:5001/shows/${show.show_id}`);
        const showData = res.data;
        const imagePath = showData.poster_path;
        const imageUrl = imagePath?.startsWith("http")
          ? imagePath
          : `https://image.tmdb.org/t/p/w500${imagePath}`;

        return {
          ...show,
          image_url: showData?.image_url || showData?.thumbnail || imageUrl || null,
          name: showData.name || show.show_name
        };
      } catch (err) {
        console.error("Failed to fetch currently watching show:", show.show_name);
        return { ...show, image_url: null };
      }
    }));

    setCurrentlyWatchingWithImages(updatedShows);
  };

  if (currentlyWatching.length > 0) {
    fetchImagesForCurrentlyWatching();
  }
}, [currentlyWatching]);

  
  

  return (
    <div>
      <div className="profile-header">
        <div className="profile-pic">
          <img
            src="https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"
            className="profile-avatar"
          />
          <h4 className="username"><b>{userInfo?.name}</b></h4>
        </div>
        <div className="profile-stats">
          <div className="stat">
            <div className="stat-number"><b>100</b></div>
            <div className="stat-label">Shows</div>
          </div>
          <div className="stat">
            <div className="stat-number"><b>{following}</b></div>
            <div className="stat-label">Following</div>
          </div>
          <div className="stat">
            <div className="stat-number"><b>{followers}</b></div>
            <div className="stat-label">Followers</div>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {userInfo?.bio && (
        <div className="profile-bio">
          <p className="bio-content">{userInfo.bio}</p>
        </div>
      )}

      <div className="favorite-shows">
        <h3 className="shows-label">Favorite Shows</h3>
        <div className="favorite-shows-images">
          {favoriteShows.map(show => (
            <img key={show.id} src={show.image_url || show.thumbnail} alt={show.name} className="show-icon" />
          ))}
        </div>
      </div>

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
