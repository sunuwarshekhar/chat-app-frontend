import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // error set in context
    }
  };

  return (
    <div className='auth-page'>
      <div className='auth-card'>
        <h1>Sign in</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className='auth-error'>{error}</div>}
          <input
            type='email'
            placeholder='Email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete='email'
          />
          <input
            type='password'
            placeholder='Password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete='current-password'
          />
          <button type='submit'>Sign in</button>
        </form>
        <p className='auth-switch'>
          Don’t have an account? <Link to='/register'>Register</Link>
        </p>
      </div>
    </div>
  );
}
