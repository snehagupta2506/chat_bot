import React, { useState } from 'react';
import { signupUser } from '../ api/auth';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      const res = await signupUser({ email, password });
      setMsg(res.data.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow-lg p-4">
            <h3 className="text-center mb-4">Sign Up</h3>
            <div className="form-group mb-3">
              <label>Email</label>
              <input type="email" className="form-control" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group mb-3">
              <label>Password</label>
              <input type="password" className="form-control" onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary w-100" onClick={handleSignup}>Sign Up</button>
            {msg && <div className="alert alert-info mt-3">{msg}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
