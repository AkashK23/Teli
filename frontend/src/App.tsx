import React ,{ useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar"
import "./styles.css"
import Home from "./pages/home";
import Review from "./pages/review";
import Browse from "./pages/browse";
import Activity from "./pages/activity";
import Profile from "./pages/profile";
import { Route, Routes } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
}

function App() {
  return (
  <>
    <Navbar />
    <div className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/review" element={<Review />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  </>
  )
  // const [users, setUsers] = useState<User[]>([]);
  // const [name, setName] = useState("");
  // const [email, setEmail] = useState("");

  // // Fetch users when the component loads
  // useEffect(() => {
  //   fetchUsers();
  // }, []);

  // const fetchUsers = async () => {
  //   try {
  //     const response = await axios.get("http://127.0.0.1:5000/get_users");
  //     setUsers(response.data);
  //   } catch (error) {
  //     console.error("Error fetching users:", error);
  //   }
  // };

  // const addUser = async () => {
  //   if (!name || !email) return;
  //   try {
  //     await axios.post("http://127.0.0.1:5000/add_user", {
  //       name,
  //       email,
  //     });
  //     setName("");
  //     setEmail("");
  //     fetchUsers(); // Refresh user list
  //   } catch (error) {
  //     console.error("Error adding user:", error);
  //   }
  // };

  // return (
  //   // <div>
  //   //   <h1>Teli</h1>
  //   //   <ul>
  //   //     {users.map((user) => (
  //   //       <li key={user.id}>
  //   //         {user.name} - {user.email}
  //   //       </li>
  //   //     ))}
  //   //   </ul>

  //   //   <h2>Add User</h2>
  //   //   <input
  //   //     type="text"
  //   //     placeholder="Name"
  //   //     value={name}
  //   //     onChange={(e) => setName(e.target.value)}
  //   //   />
  //   //   <input
  //   //     type="email"
  //   //     placeholder="Email"
  //   //     value={email}
  //   //     onChange={(e) => setEmail(e.target.value)}
  //   //   />
  //   //   <button onClick={addUser}>Add</button>
  //   // </div>
  //   <header className="bg-gray-900 text-white p-4 shadow-lg">
  //     <div className="container mx-auto flex items-center justify-between w-full">
      
  //     {/* Website Title with Red Background */}
  //     <h1 className="text-2xl font-bold bg-red-600 text-white px-4 py-2 rounded-lg inline-block">
  //         Teli
  //       </h1>

        
  //       {/* Navigation Menu */}
  //       <nav className="flex space-x-6">
  //         <button className="px-4 py-2 rounded-lg hover:bg-gray-700">Home</button>
  //         <button className="px-4 py-2 rounded-lg hover:bg-gray-700">Browse</button>
  //         <button className="px-4 py-2 rounded-lg hover:bg-gray-700">Review</button>
  //         <button className="px-4 py-2 rounded-lg hover:bg-gray-700">Activity</button>
  //         <button className="px-4 py-2 rounded-lg hover:bg-gray-700">Profile</button>
  //       </nav>
  //     </div>
  //   </header>
  // );
}

export default App;

