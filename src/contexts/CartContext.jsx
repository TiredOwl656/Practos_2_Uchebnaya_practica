import { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

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
        return {
          ...state,
          items: state.items.map(i => 
            i.product_id === action.product.product_id 
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        };
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

  const addToCart = async (product, userId) => {
    if (!userId) return;
    try {
      await axios.post('http://localhost:3001/api/cart/add', {
        userId,
        product_id: product.product_id,
        quantity: 1
      });
      dispatch({ type: 'ADD', product: {
        product_id: product.product_id,
        product_name: product.product_name,
        base_price: product.base_price,
        image_url: product.image_url
      }});
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  };

  const getTotalItems = () => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const removeFromCart = async (productId) => {
    const userId = state.items[0]?.userId;
    if (!userId) return;
    try {
      await axios.delete('http://localhost:3001/api/cart/remove', {
        data: { userId, product_id: productId }
      });
      dispatch({ type: 'REMOVE', productId });
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  const clearCart = () => dispatch({ type: 'CLEAR' });

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
        items: res.data.items.map(i => ({
          ...i,
          userId
        })),
        discount: 0
      });
    } catch (err) {
      console.error('Load cart error:', err);
    }
  };

  return (
    <CartContext.Provider value={{
      state,
      addToCart,
      removeFromCart,
      clearCart,
      getTotalPrice,
      getTotalItems,
      loadCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);