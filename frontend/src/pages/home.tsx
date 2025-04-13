import React, { useRef, useEffect } from "react";

const images = [
    "https://m.media-amazon.com/images/M/MV5BZjQwYzBlYzUtZjhhOS00ZDQ0LWE0NzAtYTk4MjgzZTNkZWEzXkEyXkFqcGc@._V1_.jpg",
    "https://m.media-amazon.com/images/M/MV5BMzU5ZGYzNmQtMTdhYy00OGRiLTg0NmQtYjVjNzliZTg1ZGE4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "https://m.media-amazon.com/images/M/MV5BMTNhMDJmNmYtNDQ5OS00ODdlLWE0ZDAtZTgyYTIwNDY3OTU3XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "https://m.media-amazon.com/images/M/MV5BOTU2YmM5ZjctOGVlMC00YTczLTljM2MtYjhlNGI5YWMyZjFkXkEyXkFqcGc@._V1_QL75_UY281_CR1,0,190,281_.jpg",
    "https://m.media-amazon.com/images/M/MV5BZjE4ZDU4ZjMtZjliYS00M2ZmLThkNTItN2U3MmJjOGU0NmIxXkEyXkFqcGc@._V1_.jpg"
  ];

export default function Home() {

    

  return (
    <div>
        <h1 className="headings">You're Watching</h1>
          <div className="scroll-container">
            <img src="https://m.media-amazon.com/images/M/MV5BZjQwYzBlYzUtZjhhOS00ZDQ0LWE0NzAtYTk4MjgzZTNkZWEzXkEyXkFqcGc@._V1_.jpg" alt="The Office" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BMzU5ZGYzNmQtMTdhYy00OGRiLTg0NmQtYjVjNzliZTg1ZGE4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="Breaking Bad" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BMTNhMDJmNmYtNDQ5OS00ODdlLWE0ZDAtZTgyYTIwNDY3OTU3XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="Game of Thrones" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BOTU2YmM5ZjctOGVlMC00YTczLTljM2MtYjhlNGI5YWMyZjFkXkEyXkFqcGc@._V1_QL75_UY281_CR1,0,190,281_.jpg" alt="Friends" className="show-icon"/>
          </div>
        <h1 className="headings">Popular This Week</h1>
        <div className="scroll-container">
            <img src="https://m.media-amazon.com/images/M/MV5BMTg5NjY0NGEtMDFhOS00MzJiLTg1NWEtZDhhNWQ5MmE4ZWIxXkEyXkFqcGc@._V1_.jpg" alt="Squid Games" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BOTc2YTFiOTItZmRiNi00OWE5LThhOTEtMmZhMTkzYmRiNjIxXkEyXkFqcGc@._V1_.jpg" alt="Dune Prophecy" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BOWJhYjdjNWEtMWFmNC00ZjNkLThlZGEtN2NkM2U3NTVmMjZkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="Arcane" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BZmM1MGM0MDQtZTAzNy00ZGJkLWI4MDUtNjBmMzdhYjhlM2QwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="White Lotus" className="show-icon"/>
        </div>
        <h1 className="headings">New From Friends</h1>
        <div className="scroll-container">
            <img src="https://m.media-amazon.com/images/M/MV5BZDI5YzJhODQtMzQyNy00YWNmLWIxMjUtNDBjNjA5YWRjMzExXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="Severance" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BMWJlN2U5MzItNjU4My00NTM2LWFjOWUtOWFiNjg3ZTMxZDY1XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="The Boys" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BZmI3YWVhM2UtNDZjMC00YTIzLWI2NGUtZWIxODZkZjVmYTg1XkEyXkFqcGc@._V1_.jpg" alt="Ted Lasso" className="show-icon"/>
            <img src="https://m.media-amazon.com/images/M/MV5BMDRiNTBlY2EtZmRiZC00Mzc4LTljZDctNWQ5ZGY2NjUwNjE4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="Daredevil Born Again" className="show-icon"/>
        </div>
        <h1 className="headings">Recent Activity</h1>
        <div className="review-card">
          <div className="review-container">
          <img src="https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg" className="review-avatar"/>
            <div className="review-text">
                <h4 className="review-title"><b>The Office</b></h4> 
                <h4 className="review-subtitle"><b>See Review</b></h4> 
              </div>
            <h4 className="review-score"><b>9</b></h4> 
            <img src="https://m.media-amazon.com/images/M/MV5BZjQwYzBlYzUtZjhhOS00ZDQ0LWE0NzAtYTk4MjgzZTNkZWEzXkEyXkFqcGc@._V1_.jpg" alt="The Office" className="review-icon"/>
          </div>
        </div>
        <div className="review-card">
          <div className="review-container">
          <img src="https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg" className="review-avatar"/>
            <div className="review-text">
                <h4 className="review-title"><b>Friends</b></h4> 
                <h4 className="review-subtitle"><b>See Review</b></h4> 
              </div>
            <h4 className="review-score"><b>7</b></h4> 
            <img src="https://m.media-amazon.com/images/M/MV5BOTU2YmM5ZjctOGVlMC00YTczLTljM2MtYjhlNGI5YWMyZjFkXkEyXkFqcGc@._V1_QL75_UY281_CR1,0,190,281_.jpg" alt="Friends" className="review-icon"/>
          </div>
        </div>
        <div className="review-card">
          <div className="review-container">
          <img src="https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg" className="review-avatar"/>
            <div className="review-text">
                <h4 className="review-title"><b>The Boys</b></h4> 
                <h4 className="review-subtitle"><b>See Review</b></h4> 
              </div>
            <h4 className="review-score"><b>8</b></h4> 
            <img src="https://m.media-amazon.com/images/M/MV5BMWJlN2U5MzItNjU4My00NTM2LWFjOWUtOWFiNjg3ZTMxZDY1XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" alt="The Boys" className="review-icon"/>
          </div>
        </div>
    </div>
  )
}