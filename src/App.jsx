import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navigation from './Components/Navigation';
import ProductList from './Components/ProductList';
import CategoriesAside from './Components/CategoriesAside';
import Register from './Components/Register';
import Cart from './Components/Cart';
import Login from './Components/Login';
import Dashboard from './Components/Dashboard';
import './App.css';
import { useState } from 'react';

function MainLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="main-layout">
      {/* Основной контент — слева */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProductList selectedCategory={selectedCategory} />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>

      {isHome && <CategoriesAside onFilter={setSelectedCategory} />}
    </div>
  );
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <div className={`app ${theme}`}>
      <Router>
        <Navigation />
        <MainLayout />
        <ToastContainer />
      </Router>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;