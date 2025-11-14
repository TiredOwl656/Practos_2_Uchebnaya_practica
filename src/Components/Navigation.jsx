import { NavLink } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useTheme } from "../contexts/ThemeContext";
import "./Navigation.css";

const Navigation = () => {
  const { getTotalItems, user } = useCart();
  const { theme, toggleTheme } = useTheme();
  const totalItems = getTotalItems();

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <NavLink to="/">Магазин крокодилов</NavLink>
      </div>

      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Главная</NavLink>
        
        {user ? (
          <>
            <NavLink to="/cart" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Корзина {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Личный кабинет
            </NavLink>
          </>
        ) : (
          <NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Вход</NavLink>
        )}
      </div>

      <div className="nav-controls">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>
    </nav>
  );
};

export default Navigation;