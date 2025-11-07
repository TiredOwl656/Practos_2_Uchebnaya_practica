import { useCart } from "../contexts/CartContext";
import "./Cart.css";

const Cart = () => {
   const { cart, removeFromCart, getTotalPrice, clearCart } = useCart();

   if (cart.items.length === 0) {
      return (
         <div className="cart-page">
            <div className="cart-container">
               <div className="cart-header">
                  <h2>Корзина</h2>
               </div>
               <div className="empty-cart">
                  <p>Ваша корзина пуста</p>
               </div>
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
                  Очистить корзину
               </button>
            </div>

            <div className="cart-content">
               <div className="cart-items">
                  {cart.items.map((item) => (
                     <div key={item.id} className="cart-item">
                        <div className="cart-item-image">
                           <img src={item.image} alt={item.name} />
                        </div>
                        <div className="cart-item-info">
                           <h4>{item.name}</h4>
                           <p className="cart-item-price">
                              {item.price} ₽ × {item.quantity}
                           </p>
                        </div>
                        <div className="cart-item-total">
                           {item.price * item.quantity} ₽
                        </div>
                        <button
                           className="remove-btn"
                           onClick={() => removeFromCart(item.id)}
                        >
                           ✕
                        </button>
                     </div>
                  ))}
               </div>

               <div className="cart-footer">
                  <div className="cart-total">
                     Итого: <span>{getTotalPrice()} ₽</span>
                  </div>
                  <button className="checkout-btn">Оформить заказ</button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Cart;
