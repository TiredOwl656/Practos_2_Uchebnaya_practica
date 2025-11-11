import { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

const cartHandlers = {
  INSERT_INTO_THE_CART: (state, payload) => {
    const existingItem = state.items.find(item => item.id === payload.id);
    
    if (existingItem) {
      return {
        ...state,
        items: state.items.map(item =>
          item.id === payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      };
    }
    
    return {
      ...state,
      items: [...state.items, { ...payload, quantity: 1 }]
    };
  },
  
  DELETE_FROM_CART: (state, payload) => ({
    ...state,
    items: state.items.filter(item => item.id !== payload)
  }),
  
  CLEAR_CART: (state) => ({
    ...state,
    items: []
  })
};

const cartReducer = (state, action) => {
  const handler = cartHandlers[action.type];
  return handler ? handler(state, action.payload) : state;
};

const initialState = {
  items: []
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const cartActions = {
    addToCart: (product) => dispatch({ type: 'INSERT_INTO_THE_CART', payload: product }),
    removeFromCart: (productId) => dispatch({ type: 'DELETE_FROM_CART', payload: productId }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' })
  };

  const cartCalculations = {
    getTotalPrice: () => state.items.reduce((total, item) => total + (item.price * item.quantity), 0),
    getTotalItems: () => state.items.reduce((total, item) => total + item.quantity, 0)
  };

  return (
    <CartContext.Provider value={{
      cart: state,
      ...cartActions,
      ...cartCalculations
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};