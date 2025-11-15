import { useCart } from '../contexts/CartContext';
import './ProductCard.css';
import { toast } from 'react-toastify';

const ProductCard = ({ product, onAdd }) => {
  const { 
    product_name, 
    base_price: rawPrice, 
    image_url, 
    stock_quantity 
  } = product;

  // Приводим к числу и защищаем
  const base_price = parseFloat(rawPrice) || 0;
  const inStock = stock_quantity > 0;

  const { user } = useCart();

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Войдите, чтобы добавить в корзину');
      return;
    }
    
    if (!inStock) {
      toast.error('Товар закончился');
      return;
    }

    onAdd();
  };

  return (
    <div className="product-card">
      <div className="product-image">
        <img 
          src={image_url || '/placeholder.jpg'} 
          alt={product_name} 
          loading="lazy"
        />
      </div>
      <div className="product-info">
        <h3 className="product-name">{product_name}</h3>
        <p className="product-price">
          {base_price.toFixed(2)} ₽
        </p>
        <p className="stock-status">
          {inStock 
            ? `В наличии (${stock_quantity})` 
            : 'Нет в наличии'
          }
        </p>
        <button 
          className={`add-to-cart ${!inStock ? 'disabled' : ''}`}
          onClick={handleAddToCart}
          disabled={!inStock}
        >
          {inStock ? 'В корзину' : 'Недоступно'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;