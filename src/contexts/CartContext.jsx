import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CartContext = createContext();

const initialState = {
  items: [],
  discount: 0
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD':
      return { ...state, items: action.items, discount: action.discount };
    case 'ADD':
      const existing = state.items.find(i => i.product_id === action.product.product_id);
      
      if (existing) {
        if (existing.quantity + 1 > action.product.stock_quantity) {
          toast.error('Нельзя добавить больше товара, чем есть в наличии');
          return state;
        }
        
        return {
          ...state,
          items: state.items.map(i =>
            i.product_id === action.product.product_id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        };
      }
      
      if (action.product.stock_quantity < 1) {
        toast.error('Товар закончился');
        return state;
      }
      
      return {
        ...state,
        items: [...state.items, { ...action.product, quantity: 1 }]
      };
    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter(i => i.product_id !== action.productId)
      };
    case 'CLEAR':
      return { ...state, items: [] };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [user, setUser] = useState(null);

  const addToCart = async (product, userId) => {
    if (!userId) return;
    
    try {
      const productRes = await axios.get(`http://localhost:3001/api/products/${product.product_id}`);
      const currentStock = productRes.data.stock_quantity;
      
      const existingItem = state.items.find(item => item.product_id === product.product_id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      
      if (currentQuantity + 1 > currentStock) {
        toast.error(`Можно добавить только ${currentStock - currentQuantity} шт. этого товара`);
        return;
      }
      
      await axios.post('http://localhost:3001/api/cart/add', {
        userId,
        product_id: product.product_id,
        quantity: 1
      });
      
      dispatch({
        type: 'ADD',
        product: {
          product_id: product.product_id,
          product_name: product.product_name,
          base_price: product.base_price,
          image_url: product.image_url,
          stock_quantity: currentStock
        }
      });
    } catch (err) {
      console.error('Add to cart error:', err);
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Ошибка добавления в корзину');
      }
    }
  };

  const getTotalItems = () => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const removeFromCart = async (productId) => {
    if (!user) return;
    try {
      await axios.delete('http://localhost:3001/api/cart/remove', {
        data: { userId: user.id, product_id: productId }
      });
      dispatch({ type: 'REMOVE', productId });
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  const clearCart = async () => {
    if (!user) return;
    try {
      await axios.delete('http://localhost:3001/api/cart/clear', {
        data: { userId: user.id }
      });
      dispatch({ type: 'CLEAR' });
    } catch (err) {
      console.error('Clear cart error:', err);
    }
  };

  const getTotalPrice = () => {
    const subtotal = state.items.reduce((sum, i) => sum + i.base_price * i.quantity, 0);
    return subtotal * (1 - state.discount / 100);
  };

  const loadCart = async (userId) => {
    if (!userId) return;
    try {
      const res = await axios.get(`http://localhost:3001/api/cart/${userId}`);
      dispatch({
        type: 'LOAD',
        items: res.data.items,
        discount: res.data.discount || 0
      });
    } catch (err) {
      console.error('Load cart error:', err);
    }
  };

  const login = (userData, discount) => {
    setUser(userData);
    dispatch({ type: 'LOAD', items: [], discount });
    loadCart(userData.id);
  };

  const logout = () => {
    setUser(null);
    dispatch({ type: 'CLEAR' });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      loadCart(parsed.id);
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  return (
    <CartContext.Provider value={{
      state,
      user,
      addToCart,
      removeFromCart,
      clearCart,
      getTotalPrice,
      getTotalItems,
      loadCart,
      login,
      logout
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);