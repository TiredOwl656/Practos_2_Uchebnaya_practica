import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = () => {
        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
            navigate('/dashboard');
        }, 1000);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Вход в систему</h2>
                        <p>Добро пожаловать в магазин чего-то там</p>
                    </div>

                    <div className="login-content">
                        <div className="demo-info">
                            <p>Для демонстрации просто нажмите кнопку "Войти"</p>
                        </div>

                        <button
                            className={`login-button ${isLoading ? 'loading' : ''}`}
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="spinner"></div>
                                    Вход...
                                </>
                            ) : (
                                'Войти'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;