import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ShowDetails() {
  const { id } = useParams();
  const [showData, setShowData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("ID: ",id)
        const res = await axios.get(`http://localhost:5001/shows/${id}`);
        console.log("Res: ",res)
        setShowData(res.data);
      } catch (err) {
        console.error("Failed to fetch show details:", err);
      }
    };

    fetchData();
  }, [id]);

  if (!showData) return <div>Loading...</div>;

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
    </div>
  );
}
