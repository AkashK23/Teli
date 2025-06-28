import React ,{ useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar"
import "./styles.css"
import Home from "./pages/home";
import Search from "./pages/search";
import Browse from "./pages/browse";
import Activity from "./pages/activity";
import Profile from "./pages/profile";
import { Route, Routes } from "react-router-dom";
import ShowDetails from './pages/showDetails';

function App() {
  return (
  <>
    <Navbar />
    <div className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/show/:id" element={<ShowDetails />} />
        <Route path="/search" element={<Search />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  </>
  )
}

export default App;

