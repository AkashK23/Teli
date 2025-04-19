import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ShowDetails() {
  const { title } = useParams();
  const [showData, setShowData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5001/shows/search?query=${encodeURIComponent(title || '')}`);
        if (Array.isArray(res.data.data) && res.data.data.length > 0) {
          setShowData(res.data.data[0]);
        } else {
          console.warn("No show found with that title.");
        }
      } catch (err) {
        console.error("Failed to fetch show details:", err);
      }
    };

    fetchData();
  }, [title]);

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
          src={showData.image_url}
          alt={showData.name}
          style={{ width: '300px', borderRadius: '10px' }}
        />
        <div>
          <h1 style={{ marginBottom: '1rem' }}>{showData.name}</h1>
          <p><strong>Year:</strong> {showData.year}</p>
          <p><strong>Network:</strong> {showData.network}</p>
          <p><strong>Overview:</strong> {showData.overview || 'No description available.'}</p>
        </div>
      </div>
    </div>
  );
}
