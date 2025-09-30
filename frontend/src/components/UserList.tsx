import React from "react";
import { Link } from "react-router-dom";

interface UserListProps {
  users: any[];
}

const UserList: React.FC<UserListProps> = ({ users }) => {
  return (
    <ul className="following-list">
      {users.map((user) => (
        <li key={user.id} className="following-item">
          <Link to={`/profile/${user.id}`}>
            <img
              src={
                user?.picture
                  ? user.picture.slice(0, -4) + "1080"
                  : "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg"
              }
              alt={user.name}
              className="following-avatar"
            />
            <span className="following-name">{user.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default UserList;
