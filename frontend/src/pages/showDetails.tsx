import { useParams } from 'react-router-dom';
import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';

export default function ShowDetails() {
  const { id } = useParams();
  const [showData, setShowData] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<{ [key: number]: any[] }>({});
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0); 
  const [submitted, setSubmitted] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userHasRated, setUserHasRated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("ID: ",id)
        const res = await axios.get(`http://localhost:5001/shows/${id}`);
        console.log("Res: ",res)
        setShowData(res.data);

        await fetchReviews();

        // const reviews_backend = await axios.get(`http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/ratings`);
        // setReviews(reviews_backend.data);
        // console.log("Reviews: ",reviews)

        // setUserHasRated(reviews_backend.data.some((r: any) => r.show_id === id));
        
      } catch (err) {
        console.error("Failed to fetch show details:", err);
      }
    };

    fetchData();
  }, [id]);

  const fetchSeason = async (seasonNumber: number) => {
    if (seasonEpisodes[seasonNumber]) {
      setSelectedSeason(seasonNumber);
      return;
    }

    try {
      console.log(showData.seasons)
      setSeasonEpisodes((prev) => ({ ...prev, [seasonNumber]: showData.seasons }));
      setSelectedSeason(seasonNumber);
    } catch (err) {
      console.error(`Failed to fetch season ${seasonNumber} episodes:`, err);
    }
  };

  const fetchReviews = async () => {
    const reviews_backend = await axios.get(`http://localhost:5001/users/Gem55qTyh44NPdFwWZgw/ratings`);
    setReviews(reviews_backend.data);
    setUserHasRated(reviews_backend.data.some((r: any) => String(r.show_id) === String(id)));
  };


  const handleReviewSubmit = async () => {

    const payload = {
      user_id: "Gem55qTyh44NPdFwWZgw", // Replace with actual user ID
      show_id: id,      // ID from URL params
      rating: rating,
      comment: reviewText
    };

    try {
      const res = await axios.post('http://localhost:5001/ratings', payload);
      console.log("Review submitted:", res.data);

      await fetchReviews();

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setReviewText('');
      setRating(0);
    } catch (err) {
      console.error("Error submitting review:", err);
    }
  };

  if (!showData) return <div>Loading...</div>;

  const seasons = showData.seasons?.filter((s: any) => s.season_number > 0) || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      <div
        className="show-details-container"
        style={{
          display: 'flex',
          gap: '2rem',
          alignItems: 'flex-start',
        }}
      >
        <img
          src={`https://image.tmdb.org/t/p/w500${showData.poster_path}`}
          alt={showData.name}
          style={{ width: '300px', borderRadius: '10px' }}
        />
        <div>
          <h1 style={{ marginBottom: '1rem' }}>{showData.name}</h1>
          <p>{showData.first_air_date?.slice(0, 4)}-{showData.last_air_date?.slice(0, 4)}</p>
          {showData.networks?.[0]?.name && (
            <p><strong>Network:</strong> {showData.networks[0].name}</p>
          )}
          <p><strong>Overview:</strong> {showData.overview || 'No description available.'}</p>
        </div>
      </div>
      
      {/* Your Review */}
      {userHasRated && (
        <h2 className="text-lg font-semibold mb-2" style={{ marginBottom: '2rem' }}>Your Review</h2>
      )}
        {userHasRated && (
        <div className="rating-cards-container">
          {reviews
            .filter((review: any) => review.show_id === id)
            .map((review: any) => (
              <div className="rating-card" key={review.show_id}>
                <div className="rating-details">
                  <div className="rating-score">{review.rating}</div>
                  <div className="rating-text">
                    <p>{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}


      {/* Write a Review Section */}
      <div style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ marginTop: '2rem' }}>
              {userHasRated ? (
                <h2 className="text-lg font-semibold mb-2">Update Review</h2> 
              ) : (
                <h2 className="text-lg font-semibold mb-2">Review</h2> 
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  style={{
                    width: '90%',
                    appearance: 'none',
                    height: '6px',
                    background: '#ddd',
                    borderRadius: '5px',
                    outline: 'none',
                    padding: '0',
                    margin: '0',
                  }}
                />
                <span
                  style={{
                    fontWeight: 'bold',
                    fontSize: '3rem',
                    color: '#333',
                    marginLeft: '1rem',
                    width: '40px',
                    textAlign: 'right',
                    marginRight: '2rem'
                  }}
                >
                  {rating}
                </span>
              </div>
            </div>



          </div>

          <div>
            <textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              placeholder="What did you think of this show?"
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid #ccc',
                resize: 'vertical'
              }}
            />
          </div>

          {userHasRated ? (
                <button
                  onClick={handleReviewSubmit}
                  style={{
                    backgroundColor: '#333',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: 'fit-content'
                  }}
                >
                  Update Review
                </button>
              ) : (
                <button
                  onClick={handleReviewSubmit}
                  style={{
                    backgroundColor: '#333',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: 'fit-content'
                  }}
                >
                  Submit Review
                </button>
              )}
          {submitted && <p style={{ color: 'green' }}>Review submitted!</p>}
        </div>
      </div>


      {/* Season ticker */}
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <h3>Seasons</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '1rem' }}>
          {seasons.map((season: any) => (
            <button
              key={season.season_number}
              onClick={() => fetchSeason(season.season_number)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #333',
                background: selectedSeason === season.season_number ? '#333' : 'white',
                color: selectedSeason === season.season_number ? 'white' : '#333',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              S{season.season_number}
            </button>
          ))}
        </div>
      </div>

      {/* Episodes list */}
      {selectedSeason && seasonEpisodes[selectedSeason] && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Season {selectedSeason} Episodes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {seasonEpisodes[selectedSeason].map((episode: any) => (
              <div key={episode.id} style={{ padding: '1rem', background: '#f4f4f4', borderRadius: '8px' }}>
                <strong>{episode.episode_number}. {episode.name}</strong>
                <p style={{ marginTop: '0.5rem' }}>{episode.overview || 'No description available.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
