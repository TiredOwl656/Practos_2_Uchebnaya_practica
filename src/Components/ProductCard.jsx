import { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import './ProductCard.css'

const ProductCard = ({ product }) => {
    const { addToCart, cart } = useCart();
    const [showNotification, setShowNotification] = useState(false);

    const handleAddToCart = () => {
        addToCart(product);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 2000);
    };

    const cartItem = cart.items.find(item => item.id === product.id);
    const quantity = cartItem ? cartItem.quantity : 0;

    return (
        <div className='product-card'>
            <div className='product-image'>
                <img src={product.image} alt={product.name} />
            </div>

            <div className='product-info'>
                <h3 className='product-name'>{product.name}</h3>
                <p className='product-price'>{product.price} ₽</p>
                <button className='add-to-cart' onClick={handleAddToCart}>
                    В корзину
                </button>

                {showNotification && (
                    <div className="add-notification">Товар добавлен в корзину!</div>
                )}

                {quantity > 0 && (
                    <span className='quantity-counter'>{quantity}</span>
                )}
            </div>
        </div>
    );
};

export default ProductCard;