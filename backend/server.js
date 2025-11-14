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
  const email = req.body.userEmail || req.query.userEmail || req.headers['user-email'];
  if (!email) return res.status(401).json({ error: 'Авторизуйтесь' });
  try {
    const resUser = await pool.query('SELECT role_id FROM users WHERE email = $1', [email]);
    if (!resUser.rows[0] || resUser.rows[0].role_id !== 2) {
      return res.status(403).json({ error: 'Только админ' });
    }
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ error: err.message });
  }
};

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
      user: { id: user.user_id, email: user.email, role_id: user.role_id },
      personalDiscount: discount
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === КАТЕГОРИИ ===
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id, category_name FROM categories ORDER BY category_name');
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
    console.error('Categories POST error:', err);
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
    console.error('Categories PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM categories WHERE category_id = $1 RETURNING category_id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Категория не найдена' });
    res.json({ success: true });
  } catch (err) {
    console.error('Categories DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ТОВАРЫ ===
app.get('/api/products', async (req, res) => {
  const { category_id } = req.query;
  let query = `
    SELECT p.product_id, p.product_name, p.description, p.duration, 
           p.base_price, p.image_url, p.category_id, p.stock_quantity,
           c.category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.category_id
  `;
  let params = [];
  if (category_id) {
    query += ' WHERE p.category_id = $1';
    params = [category_id];
  }
  query += ' ORDER BY p.product_name';

  try {
    const result = await pool.query(query, params);
    // Добавляем вычисляемое поле: in_stock
    const products = result.rows.map(p => ({
      ...p,
      in_stock: p.stock_quantity > 0
    }));
    res.json(products);
  } catch (err) {
    console.error('Products GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', adminMiddleware, async (req, res) => {
  const {
    product_name, description, duration, base_price,
    category_id, image_url, stock_quantity = 0
  } = req.body;

  if (!product_name || !base_price || !category_id) {
    return res.status(400).json({ error: 'Заполните обязательные поля' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO products 
      (product_name, description, duration, base_price, category_id, image_url, stock_quantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING product_id, product_name, description, duration, base_price, 
                image_url, category_id, stock_quantity
    `, [
      product_name,
      description || null,
      duration || null,
      base_price,
      category_id,
      image_url || null,
      stock_quantity
    ]);
    const product = result.rows[0];
    res.json({ ...product, in_stock: product.stock_quantity > 0 });
  } catch (err) {
    console.error('Products POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    product_name, description, duration, base_price,
    category_id, image_url, stock_quantity
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE products SET 
        product_name = $1, description = $2, duration = $3, base_price = $4,
        category_id = $5, image_url = $6, stock_quantity = $7
      WHERE product_id = $8 
      RETURNING product_id, product_name, description, duration, base_price,
                image_url, category_id, stock_quantity
    `, [
      product_name, description || null, duration || null, base_price,
      category_id, image_url || null, stock_quantity, id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
    const product = result.rows[0];
    res.json({ ...product, in_stock: product.stock_quantity > 0 });
  } catch (err) {
    console.error('Products PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM products WHERE product_id = $1 RETURNING product_id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
    res.json({ success: true });
  } catch (err) {
    console.error('Products DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ПОЛЬЗОВАТЕЛИ ===
app.get('/api/users', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, email, first_name, last_name, personal_discount FROM users ORDER BY email'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Users GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/discount', adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { personal_discount } = req.body;
  if (personal_discount === undefined) return res.status(400).json({ error: 'Укажите скидку' });
  try {
    const result = await pool.query(
      'UPDATE users SET personal_discount = $1 WHERE user_id = $2 RETURNING user_id, email, personal_discount',
      [personal_discount, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Users PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === РЕГИСТРАЦИЯ ===
app.post('/api/auth/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть ≥6 символов' });
  }

  try {
    // Проверка на дубликат email
    const exists = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Email уже занят' });
    }

    // ВСТАВЛЯЕМ ПАРОЛЬ
    const result = await pool.query(`
      INSERT INTO users (email, password, first_name, last_name, role_id, personal_discount)
      VALUES ($1, $2, $3, $4, 1, 0.00)
      RETURNING user_id, email, role_id, personal_discount
    `, [email, password, first_name || null, last_name || null]);

    const user = result.rows[0];

    res.json({
      user: { id: user.user_id, email: user.email, role_id: user.role_id },
      personalDiscount: user.personal_discount
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === КОРЗИНА ===
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length === 0) return res.json({ items: [] });

    const itemsRes = await pool.query(`
      SELECT ci.cart_item_id, ci.cart_id, ci.product_id, ci.quantity,
             p.product_name, p.base_price, p.image_url, p.stock_quantity
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.product_id 
      WHERE ci.cart_id = $1
    `, [cartRes.rows[0].cart_id]);

    const items = itemsRes.rows.map(item => ({
      ...item,
      in_stock: item.stock_quantity > 0
    }));
    res.json({ items });
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

app.listen(PORT, () => {
  console.log(`API запущен на http://localhost:${PORT}`);
});