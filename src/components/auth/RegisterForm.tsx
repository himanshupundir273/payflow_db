import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      showErrorToast('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      showErrorToast('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const success = await register(email, password);
      
      if (success) {
        showSuccessToast('Account created');
        navigate('/login');
      } else {
        showErrorToast('Registration failed');
        setError('Failed to create account. Please try again.');
      }
    } catch (err: any) {
      if (err?.message?.includes('Email already exists')) {
        showErrorToast('Email already registered');
        setError('This email is already registered. Please login instead.');
      } else {
        showErrorToast('Registration failed');
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Render your form components here */}
    </div>
  );
};

export default RegisterForm; 