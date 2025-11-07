import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Navigation from './Components/Navigation';
import ProductCard from './Components/ProductCard';
import Cart from './Components/Cart';
import Dashboard from './Components/Dashboard';
import Login from './Components/Login';
import './App.css';

function AppContent() {
  const { theme } = useTheme();

  const products = [
    {
      id: 1,
      name: "Смартфон прикольный",
      price: 999,
      image: "https://static.ru-mi.com/upload/resize_cache/iblock/4f6/1000_1000_1/uf19ujccpwrredc0bmuzrlahywqp2rft.jpg"
    },
    {
      id: 2,
      name: "Ноутбук NoName",
      price: 1999,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSkgWoJnRNxpjqhyquBKE2Z0w8BALM0BWJ7A&s"
    },
    {
      id: 3,
      name: "Наушники от ноутбука",
      price: 249,
      image: "https://img.freepik.com/premium-photo/headphones-dark-black-background_68747-106.jpg"
    },
    {
      id: 4,
      name: "Часы",
      price: 399,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBpfHWU-XzFa0xzPHb5Wiht27-clSxlz4mbA&s"
    },
    {
      id: 5,
      name: "Клавиатура механическая",
      price: 599,
      image: "https://dicentre.ru/wa-data/public/shop/products/73/97/29773/images/58323/58323.970.jpg"
    }
  ];

  return (
    <div className={`app ${theme}`}>
      <Router>
        <Navigation />

        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <>
                <header className='app-header'>
                  <h1>Магазин чего-то там</h1>
                  <p>Лучшие товары по лучшим ценам</p>
                </header>

                <div className='products-grid'>
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
              </>
            } />

            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
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