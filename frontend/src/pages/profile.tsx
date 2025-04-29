import { useEffect, useState } from "react";
import axios from "axios";

  
export default function Profile() {
  const [favoriteShows, setFavoriteShows] = useState<any[]>([]);
  const [watchingShows, setWatchingShows] = useState<any[]>([]);

  const favoriteNames = ["Breaking Bad", "Game of Thrones", "Friends", "The Office"];
  const watchingNames = ["Daredevil", "Dune Prophecy", "Arcane", "White Lotus"];
  const [userInfo, setUserInfo] = useState<any>(null);
  const [following, setFollowing] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);

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
        console.log(followers_backend.data.followers.length);
        setFollowers(followers_backend.data.followers.length);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };
  
    fetchData();
  }, []); // <== empty array here
  

  const fetchShowDetails = async (names: string[]) => {
    const results: any[] = [];

    for (const name of names) {
      try {
        const res = await axios.get("http://127.0.0.1:5001/shows/search", {
          params: { query: name }
        });

        const showData = res.data.data?.[0]; // first result
        if (showData) {
          results.push(showData);
        }
      } catch (err) {
        console.error(`Failed to fetch ${name}`, err);
      }
    }

    return results;
  };

  useEffect(() => {
    const fetchAllShows = async () => {
      const [fav, watching] = await Promise.all([
        fetchShowDetails(favoriteNames),
        fetchShowDetails(watchingNames)
      ]);

      setFavoriteShows(fav);
      setWatchingShows(watching);
    };

    fetchAllShows();
  }, []);

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
          {watchingShows.map(show => (
            <img key={show.id} src={show.image_url || show.thumbnail} alt={show.name} className="show-icon" />
          ))}
        </div>
      </div>
    </div>
  );
}
