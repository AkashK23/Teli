import React, { createContext, useContext, useEffect, useState } from "react";

type UserContextType = {
  userId: string | null;
  setUserId: (id: string | null) => void;
  loadingUser: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("user_id");
    if (saved) {
      setUserIdState(saved);
    }
    setLoadingUser(false);
  }, []);

  const setUserId = (id: string | null) => {
    setUserIdState(id);
    if (id) {
      localStorage.setItem("user_id", id);
    } else {
      localStorage.removeItem("user_id");
    }
  };

  return (
    <UserContext.Provider value={{ userId, setUserId, loadingUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return context;
};
