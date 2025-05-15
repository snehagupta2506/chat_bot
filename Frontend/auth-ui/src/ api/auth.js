import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3001/api', // Adjust if your backend is hosted elsewhere
});

export const signupUser = (data) => API.post('/signup', data);
export const loginUser = (data) => API.post('/login', data);
// src/api/logoutUser.js
export const logoutUser = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        localStorage.removeItem('token');
        return true;
      } else {
        console.error('Logout failed');
        return false;
      }
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  };
  