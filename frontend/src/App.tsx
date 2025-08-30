import React ,{ useEffect, useState } from "react";
import axios from "axios";


import Navbar from "./Navbar"
import "./styles.css"
import Home from "./pages/home";
import Search from "./pages/search";
import Browse from "./pages/browse";
import Activity from "./pages/activity";
import Profile from "./pages/profile";
import Login from "./pages/login";
import ShowDetails from './pages/showDetails';
import Followers from './pages/followers';
import Following from './pages/following';

import { Routes, Route } from "react-router-dom";
import { UserProvider } from "./UserContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
      <UserProvider>
          <Navbar />
          <div className="container">
            <Routes>
              {/* <Route path="/" element={<Home />} /> */}
              <Route path="/browse" element={<Browse />} />
              <Route path="/show/:id" element={<ShowDetails />} />
              <Route path="/search" element={<Search />} />
              {/* <Route path="/activity" element={<Activity />} />
              <Route path="/profile" element={<Profile />} /> */}
              <Route path="/login" element={<Login />} />
              <Route path="/users/:userId/followers" element={<Followers />} />
              <Route path="/users/:userId/following" element={<Following />} />

              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              
            </Routes>
          </div>
      </UserProvider>
  );
}

export default App;

