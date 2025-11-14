import { useCart } from '../contexts/CartContext';
import { Link } from 'react-router-dom';
import './Cart.css'; // Импорт стилей

const Cart = () => {
  const { state, removeFromCart, clearCart, getTotalPrice } = useCart();

  if (state.items.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <p>Корзина пуста</p>
          <Link to="/" className="btn-primary">Перейти к покупкам</Link>
        </div>
      </div>
    );
  }

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
            {state.items.map(item => (
              <div key={item.cart_item_id} className="cart-item">
                <div className="cart-item-image">
                  <img src={item.image_url || '/placeholder.jpg'} alt={item.product_name} />
 È               </div>
                <div className="cart-item-info">
                  <h4>{item.product_name}</h4>
                  <p className="cart-item-price">{item.base_price} ₽ × {item.quantity}</p>
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
            <div className="cart-total">
              Итого: <span>{getTotalPrice().toFixed(2)} ₽</span>
            </div>
            <button className="checkout-btn">Оформить заказ</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;