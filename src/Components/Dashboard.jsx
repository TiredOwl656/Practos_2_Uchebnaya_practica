import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleBackToShop = () => {
    navigate('/');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="user-info">
            <h2>Личный кабинет</h2>
            <p>Добро пожаловать в личный кабинет!</p>
          </div>
          <button className="back-btn" onClick={handleBackToShop}>
            Вернуться в магазин
          </button>
        </div>

        <div className="dashboard-content">
          <div className="welcome-section">
            <h3>Это страница личного кабинета</h3>
            <p>
              Текст намазывают на текст и текстом запивают, параллельно смотря на текст написанный текстом в тексте за мизерный текст.
            </p>

            <div className="demo-features">
              <h4>Что здесь могло бы быть:</h4>
              <ul>
                <li>много текст</li>
                <li>ТТТТекст</li>
                <li>текст текст</li>
                <li>тееекст</li>
                <li>Текст текст текст!!!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;