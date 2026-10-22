import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Swal from 'sweetalert2';
import API from '../services/api';
import { loginUser } from '../services/auth';
import './Login.css';
import { MdEmail, MdLock } from 'react-icons/md';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Email address or mobile number is required')
    .refine((val) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isMobile = /^[6-9]\d{9}$/.test(val);
      return isEmail || isMobile;
    }, 'Please enter a valid email address or 10-digit mobile number'),
  password: z
    .string()
    .min(1, 'Password is required')
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    const cleanVal = data.identifier.trim();
    const payload = cleanVal.includes('@')
      ? { email: cleanVal.toLowerCase(), password: data.password }
      : { mobile: cleanVal, password: data.password };

    try {
      const res = await API.post('/auth/vendor/login', payload);

      if (res.data.success) {
        if (res.data.data?.token) {
          localStorage.setItem('vendor_token', res.data.data.token);
        }
        loginUser(res.data.data.user);
        Swal.fire({
          title: 'Success!',
          text: 'Logged in successfully!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          navigate('/dashboard');
        });
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((e: any) => {
          if (e.field === 'email' || e.field === 'mobile') setError('identifier', { type: 'server', message: e.message });
          if (e.field === 'password') setError('password', { type: 'server', message: e.message });
        });
      } else {
        Swal.fire({
          title: 'Login Failed',
          text: err.response?.data?.message || 'Invalid email/mobile or password',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header text-center mb-4">
          <div className="vendor-logo-wrapper">
            <MdLock className="vendor-logo-icon" />
          </div>
          <h2 className="login-title mb-0">Vendor Login</h2>
          <p className="login-subtitle mt-2">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="identifier">Email or Mobile Number</label>
            <div className="input-icon-wrapper">
              <MdEmail className="input-icon" />
              <input
                type="text"
                id="identifier"
                className={`form-control with-icon ${errors.identifier ? 'input-error' : ''}`}
                placeholder="vendor@example.com or 9876543210"
                {...register('identifier')}
              />
            </div>
            {errors.identifier && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                {errors.identifier.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="password" className="mb-0">Password</label>
              <Link to="/forgot-password" className="forgot-password-link">Forgot Password</Link>
            </div>
            <div className="input-icon-wrapper" style={{ position: 'relative' }}>
              <MdLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`form-control with-icon ${errors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                {...register('password')}
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash size={17} /> : <FaEye size={17} />}
              </button>
            </div>
            {errors.password && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                {errors.password.message}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-100 mt-4" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
