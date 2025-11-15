import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Cart.css';

const Cart = () => {
  const { state, removeFromCart, clearCart, getTotalPrice, user } = useCart();
  const { items, discount } = state;
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Войдите для оформления заказа');
      navigate('/login');
      return;
    }

    // Проверяем, что все товары в наличии в нужном количестве
    const outOfStockItems = items.filter(item => item.stock_quantity < item.quantity);
    if (outOfStockItems.length > 0) {
      toast.error('Некоторые товары закончились на складе');
      return;
    }

    try {
      const res = await axios.post('http://localhost:3001/api/orders/create', {
        userId: user.id,
        items: items
      });
      
      toast.success('Заказ оформлен успешно!');
      clearCart(); // Очищаем корзину после оформления
      navigate('/dashboard'); // Перенаправляем в историю заказов
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.response?.data?.error || 'Ошибка оформления заказа');
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <p>Корзина пуста</p>
          <Link to="/" className="btn-primary">Перейти к покупкам</Link>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.base_price * i.quantity, 0);
  const finalPrice = getTotalPrice();

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h2>Корзина</h2>
          <button className="clear-cart-btn" onClick={clearCart}>
            Очистить
          </button>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {items.map((item, index) => (
              <div 
                key={item.cart_item_id || item.product_id || `cart-item-${index}`} 
                className="cart-item"
              >
                <div className="cart-item-image">
                  <img src={item.image_url || '/placeholder.jpg'} alt={item.product_name} />
                </div>
                <div className="cart-item-info">
                  <h4>{item.product_name}</h4>
                  <p className="cart-item-price">{item.base_price} ₽ × {item.quantity}</p>
                  <p className={`stock-info ${item.stock_quantity < item.quantity ? 'out-of-stock' : ''}`}>
                    {item.stock_quantity > 0 
                      ? `В наличии: ${item.stock_quantity} шт.` 
                      : 'Нет в наличии'
                    }
                    {item.stock_quantity < item.quantity && (
                      <span className="warning"> (в корзине больше чем есть!)</span>
                    )}
                  </p>
                </div>
                <div className="cart-item-total">
                  {(item.base_price * item.quantity).toFixed(2)} ₽
                </div>
                <button 
                  className="remove-btn" 
                  onClick={() => removeFromCart(item.product_id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="cart-footer">
            <div className="cart-total-summary">
              <div className="price-row">
                <span>Подытог:</span>
                <span>{subtotal.toFixed(2)} ₽</span>
              </div>
              {discount > 0 && (
                <div className="price-row discount">
                  <span>Скидка ({discount}%): </span>
                  <span>-{(subtotal * discount / 100).toFixed(2)} ₽</span>
                </div>
              )}
              <div className="price-row total">
                <span>Итого: </span>
                <span>{finalPrice.toFixed(2)} ₽</span>
              </div>
            </div>
            <button 
              className="checkout-btn" 
              onClick={handleCheckout}
              disabled={!user || items.some(item => item.stock_quantity < item.quantity)}
            >
              {!user ? 'Войдите для заказа' : 
               items.some(item => item.stock_quantity < item.quantity) ? 
               'Исправьте количество товаров' : 'Оформить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;