import { useCart } from '../contexts/CartContext';
import './ProductCard.css'; // Импорт стилей

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
          onClick={onAdd}
          disabled={!inStock}
        >
          {inStock ? 'В корзину' : 'Недоступно'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;