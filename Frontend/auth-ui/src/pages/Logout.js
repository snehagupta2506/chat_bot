// components/LogoutButton.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../ api/auth';

const LogoutButton = ({ setIsLoggedIn }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const success = await logoutUser();
    if (success) {
      setIsLoggedIn(false);
      navigate('/login');
    }
  };

  return (
    <button className="btn btn-outline-light ms-2" onClick={handleLogout}>
      🚪 Logout
    </button>
  );
};

export default LogoutButton;
