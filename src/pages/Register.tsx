import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register(email, password, displayName || undefined);
      navigate('/', { replace: true });
    } catch {
      // error set in context
    }
  };

  return (
    <div className='auth-page'>
      <div className='auth-card'>
        <h1>Create account</h1>
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
            type='text'
            placeholder='Display name (optional)'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete='name'
          />
          <input
            type='password'
            placeholder='Password (min 8 characters)'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete='new-password'
          />
          <button type='submit'>Register</button>
        </form>
        <p className='auth-switch'>
          Already have an account? <Link to='/login'>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
