import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';
import ProductCard from './ProductCard';
import './ProductList.css';

const API = 'http://localhost:3001/api';

const ProductList = ({ selectedCategory }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, user } = useCart();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const url = selectedCategory 
          ? `${API}/products?category_id=${selectedCategory}` 
          : `${API}/products`;
        console.log('Получение товваров из БД');
        const res = await axios.get(url);
        if(res){
          console.log("Товары получены")
        }
        setProducts(res.data);
      } catch (err) {
        toast.error('Ошибка загрузки товаров');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [selectedCategory]);

  const handleAddToCart = async (product) => {
    if (!user) {
      toast.error('Войдите, чтобы добавить в корзину');
      return;
    }

    if (product.stock_quantity <= 0) {
      toast.error('Товар закончился');
      return;
    }

    try {
      await addToCart(product, user.id);
      toast.success('Товар добавлен в корзину');
    } catch (err) {
      toast.error('Ошибка добавления в корзину');
    }
  };

  if (loading) return <div className="loading">Загрузка товаров...</div>;

  return (
    <div className="product-list">
      <div className="products-grid">
        {products.map(p => (
          <ProductCard 
            key={p.product_id} 
            product={p} 
            onAdd={() => handleAddToCart(p)} 
          />
        ))}
      </div>
    </div>
  );
};

export default ProductList;