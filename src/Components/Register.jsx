import { useState } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Register.css';

const API = 'http://localhost:3001/api';

const Register = () => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useCart();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Заполните email и пароль');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Пароль ≥6 символов');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, form);
      login(res.data.user, res.data.personalDiscount);
      toast.success('Регистрация успешна! Добро пожаловать!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <h2 className="register-title">Регистрация</h2>
          <p className="register-subtitle">Создайте аккаунт</p>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@mail.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Пароль *</label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="минимум 6 символов"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="first_name">Имя</label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="Иван"
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Фамилия</label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Иванов"
              />
            </div>

            <button 
              type="submit" 
              className="register-btn"
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="register-footer">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="login-link">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;