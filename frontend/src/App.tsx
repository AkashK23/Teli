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
        <Route path="/show/:id" element={<ShowDetails />} />
        <Route path="/search" element={<Search />} />
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
// fetchUsers();
// }, []);

// const fetchUsers = async () => {
// try {
// const response = await axios.get("http://127.0.0.1:5000/get_users");
// setUsers(response.data);
// } catch (error) {
// console.error("Error fetching users:", error);
// }
// };

// const addUser = async () => {
// if (!name || !email) return;
// try {
// await axios.post("http://127.0.0.1:5000/add_user", {
//   name,
//   email,
// });
// setName("");
// setEmail("");
// fetchUsers(); // Refresh user list
// } catch (error) {
// console.error("Error adding user:", error);
// }
// };

// return (
// <div>
//   <h1>Teli</h1>
//   <ul>
//     {users.map((user) => (
//       <li key={user.id}>
//         {user.name} - {user.email}
//       </li>
//     ))}
//   </ul>

//   <h2>Add User</h2>
//   <input
//     type="text"
//     placeholder="Name"
//     value={name}
//     onChange={(e) => setName(e.target.value)}
//   />
//   <input
//     type="email"
//     placeholder="Email"
//     value={email}
//     onChange={(e) => setEmail(e.target.value)}
//   />
//   <button onClick={addUser}>Add</button>
// </div>
//   );
}

export default App;

