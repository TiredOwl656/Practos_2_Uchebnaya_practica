require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT,
});

// === АДМИН МИДЛВАР ===
const adminMiddleware = async (req, res, next) => {
  const email =
    req.headers['user-email'] ||
    req.query.userEmail ||
    (req.body && req.body.userEmail);

  if (!email) {
    return res.status(401).json({ error: 'Авторизуйтесь (email не передан)' });
  }

  try {
    const resUser = await pool.query('SELECT role_id FROM users WHERE email = $1', [email]);
    if (!resUser.rows[0] || resUser.rows[0].role_id !== 2) {
      return res.status(403).json({ error: 'Только админ' });
    }
    req.userEmail = email;
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ error: err.message });
  }
};

// === ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ===
app.get('/api/auth/me', async (req, res) => {
  const email = req.headers['user-email'];
  if (!email) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const userRes = await pool.query('SELECT user_id, email, role_id, personal_discount FROM users WHERE email = $1', [email]);
    if (!userRes.rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(userRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === ЛОГИН ===
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните поля' });

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const discount = user.personal_discount || 0;
    res.json({
      user: { id: user.user_id, email: user.email, role_id: user.role_id, personal_discount: discount },
      personalDiscount: discount
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === РЕГИСТРАЦИЯ ===
app.post('/api/auth/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  try {
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const newUser = await pool.query(
      `INSERT INTO users (
        email, password, first_name, last_name, role_id, personal_discount
      ) VALUES ($1, $2, $3, $4, 1, 0)
      RETURNING user_id, email, role_id, personal_discount`,
      [email, password, first_name || null, last_name || null]
    );

    const user = newUser.rows[0];

    res.json({
      user: {
        id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        personal_discount: user.personal_discount || 0
      },
      personalDiscount: user.personal_discount || 0
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// === СОЗДАНИЕ ЗАКАЗА ===
app.post('/api/orders/create', async (req, res) => {
  const { userId, items } = req.body;

  if (!userId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Нет товаров для заказа' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const totalAmount = items.reduce((sum, item) => sum + (item.base_price * item.quantity), 0);

    const statusRes = await client.query(
      "SELECT status_id FROM order_statuses WHERE status_name = 'оформлен'"
    );
    const statusId = statusRes.rows[0].status_id;

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, status_id, total_amount) 
       VALUES ($1, $2, $3) RETURNING order_id`,
      [userId, statusId, totalAmount]
    );
    const orderId = orderRes.rows[0].order_id;

    for (const item of items) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
        [item.quantity, item.product_id]
      );
    }

    const cartRes = await client.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length > 0) {
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRes.rows[0].cart_id]);
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      order_id: orderId,
      total_amount: totalAmount 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  } finally {
    client.release();
  }
});

// === ИСТОРИЯ ЗАКАЗОВ ===
app.get('/api/orders/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const ordersRes = await pool.query(`
      SELECT 
        o.order_id,
        o.total_amount,
        o.created_at,
        os.status_name,
        os.status_description
      FROM orders o
      JOIN order_statuses os ON o.status_id = os.status_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [userId]);

    res.json(ordersRes.rows);
  } catch (err) {
    console.error('Orders history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ТОВАРЫ ДЛЯ ЗАКАЗА ===
app.get('/api/orders/:orderId/items', async (req, res) => {
  const { orderId } = req.params;
  
  try {
    const orderRes = await pool.query('SELECT user_id FROM orders WHERE order_id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    const userId = orderRes.rows[0].user_id;

    const cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    
    let items = [];
    if (cartRes.rows.length > 0) {
      const itemsRes = await pool.query(`
        SELECT ci.cart_item_id, ci.product_id, ci.quantity, p.product_name, p.base_price, p.image_url
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.product_id
        WHERE ci.cart_id = $1
      `, [cartRes.rows[0].cart_id]);
      
      items = itemsRes.rows;
    }

    res.json(items);
  } catch (err) {
    console.error('Order items error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ПОЛЬЗОВАТЕЛИ (ТОЛЬКО АДМИН) ===
app.get('/api/users', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT user_id, email, first_name, last_name, role_id, personal_discount 
      FROM users 
      ORDER BY user_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === УСТАНОВКА СКИДКИ (админ) ===
app.put('/api/users/discount', adminMiddleware, async (req, res) => {
  const { user_id, personal_discount } = req.body;
  if (!user_id || personal_discount === undefined) {
    return res.status(400).json({ error: 'user_id и personal_discount обязательны' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET personal_discount = $1 WHERE user_id = $2 RETURNING user_id, personal_discount',
      [personal_discount, user_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Discount update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === КАТЕГОРИИ ===
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id, category_name FROM categories ORDER BY category_id');
    res.json(result.rows);
  } catch (err) {
    console.error('Categories GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', adminMiddleware, async (req, res) => {
  const { category_name } = req.body;
  if (!category_name) return res.status(400).json({ error: 'Название обязательно' });

  try {
    const result = await pool.query(
      'INSERT INTO categories (category_name) VALUES ($1) RETURNING category_id, category_name',
      [category_name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Category POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { category_name } = req.body;
  if (!category_name) return res.status(400).json({ error: 'Название обязательно' });

  try {
    const result = await pool.query(
      'UPDATE categories SET category_name = $1 WHERE category_id = $2 RETURNING category_id, category_name',
      [category_name, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Категория не найдена' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Category PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE category_id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Category DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ТОВАРЫ ===
app.get('/api/products', async (req, res) => {
  const { category_id } = req.query;
  try {
    let query = `
      SELECT p.*, c.category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.category_id
    `;
    const params = [];
    if (category_id) {
      query += ' WHERE p.category_id = $1';
      params.push(category_id);
    }
    query += ' ORDER BY p.product_id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Products GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', adminMiddleware, async (req, res) => {
  const { product_name, description, base_price, category_id, image_url, stock_quantity } = req.body;
  if (!product_name || !base_price || !category_id) {
    return res.status(400).json({ error: 'Название, цена и категория обязательны' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (
        product_name, description, base_price, category_id, image_url, stock_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [product_name, description || null, base_price, category_id, image_url || null, stock_quantity || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Product POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { product_name, description, base_price, category_id, image_url, stock_quantity } = req.body;

  try {
    const result = await pool.query(
      `UPDATE products SET 
        product_name = $1, description = $2, base_price = $3,
        category_id = $4, image_url = $5, stock_quantity = $6
      WHERE product_id = $7 RETURNING *`,
      [product_name, description || null, base_price, category_id, image_url || null, stock_quantity || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Product PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE product_id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Product DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, c.category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Product GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ОБНОВЛЕННЫЙ ЭНДПОИНТ ДОБАВЛЕНИЯ В КОРЗИНУ ===
app.post('/api/cart/add', async (req, res) => {
  const { userId, product_id, quantity = 1 } = req.body;

  if (!userId || !product_id) {
    return res.status(400).json({ error: 'userId и product_id обязательны' });
  }

  try {
    const productRes = await pool.query(
      'SELECT stock_quantity FROM products WHERE product_id = $1',
      [product_id]
    );
    
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    const availableStock = productRes.rows[0].stock_quantity;
    
    let cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    let currentQuantity = 0;
    
    if (cartRes.rows.length > 0) {
      const existingItem = await pool.query(
        'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
        [cartRes.rows[0].cart_id, product_id]
      );
      
      if (existingItem.rows.length > 0) {
        currentQuantity = existingItem.rows[0].quantity;
      }
    }
    
    if (currentQuantity + quantity > availableStock) {
      return res.status(400).json({ 
        error: `Можно добавить только ${availableStock - currentQuantity} шт. этого товара` 
      });
    }

    let cart_id;

    if (cartRes.rows.length === 0) {
      const newCart = await pool.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING cart_id', [userId]);
      cart_id = newCart.rows[0].cart_id;
    } else {
      cart_id = cartRes.rows[0].cart_id;
    }

    await pool.query(`
      INSERT INTO cart_items (cart_id, product_id, quantity) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
    `, [cart_id, product_id, quantity]);

    res.json({ success: true });
  } catch (err) {
    console.error('Cart ADD ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// === КОРЗИНА ===
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length === 0) {
      const userRes = await pool.query('SELECT personal_discount FROM users WHERE user_id = $1', [userId]);
      const discount = userRes.rows[0]?.personal_discount || 0;
      return res.json({ items: [], discount });
    }

    const items = await pool.query(`
      SELECT ci.cart_item_id, ci.product_id, ci.quantity, p.product_name, p.base_price, p.image_url, p.stock_quantity
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.product_id
      WHERE ci.cart_id = $1
    `, [cartRes.rows[0].cart_id]);

    const userRes = await pool.query('SELECT personal_discount FROM users WHERE user_id = $1', [userId]);
    const discount = userRes.rows[0]?.personal_discount || 0;

    res.json({
      items: items.rows.map(item => ({
        ...item,
        in_stock: item.stock_quantity > 0
      })),
      discount
    });
  } catch (err) {
    console.error('Cart GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart/add', async (req, res) => {
  const { userId, product_id, quantity = 1 } = req.body;

  if (!userId || !product_id) {
    return res.status(400).json({ error: 'userId и product_id обязательны' });
  }

  try {
    let cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    let cart_id;

    if (cartRes.rows.length === 0) {
      const newCart = await pool.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING cart_id', [userId]);
      cart_id = newCart.rows[0].cart_id;
    } else {
      cart_id = cartRes.rows[0].cart_id;
    }

    await pool.query(`
      INSERT INTO cart_items (cart_id, product_id, quantity) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
    `, [cart_id, product_id, quantity]);

    res.json({ success: true });
  } catch (err) {
    console.error('Cart ADD ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cart/remove', async (req, res) => {
  const { userId, product_id } = req.body;
  if (!userId || !product_id) return res.status(400).json({ error: 'userId и product_id обязательны' });

  try {
    const cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length > 0) {
      await pool.query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cartRes.rows[0].cart_id, product_id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Cart REMOVE error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cart/clear', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId обязателен' });

  try {
    const cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length > 0) {
      await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRes.rows[0].cart_id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Cart CLEAR error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ЗАПУСК СЕРВЕРА ===
app.listen(PORT, () => {
  console.log(`API запущен на http://localhost:${PORT}`);
});