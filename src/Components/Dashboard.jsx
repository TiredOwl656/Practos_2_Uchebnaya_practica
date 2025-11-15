import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';

const API = 'http://localhost:3001/api';

const Dashboard = () => {
  const { user, logout } = useCart();
  const navigate = useNavigate();
  const isAdmin = user?.role_id === 2;

  const [tab, setTab] = useState('profile');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [errors, setErrors] = useState({});

  // === ТОВАРЫ ===
  const [form, setForm] = useState({
    product_name: '', description: '', base_price: '', category_id: '', image_url: '', stock_quantity: 0
  });
  const [editing, setEditing] = useState(null);

  // === КАТЕГОРИИ ===
  const [categoryForm, setCategoryForm] = useState({ category_name: '' });
  const [editingCategory, setEditingCategory] = useState(null);

  // === СКИДКИ ===
  const [discountForm, setDiscountForm] = useState({ user_id: '', personal_discount: '' });

  // === РЕДИРЕКТ ПРИ ВЫХОДЕ ===
  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    try {
      const config = { headers: { 'user-email': user.email } };
      const [pRes, uRes, cRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/users`, config),
        axios.get(`${API}/categories`)
      ]);
      setProducts(pRes.data);
      setUsers(uRes.data);
      setCategories(cRes.data);
    } catch (err) {
      toast.error('Ошибка загрузки данных');
    }
  };

  // === ЗАГРУЗКА ЗАКАЗОВ ===
  useEffect(() => {
    if (tab === 'orders' && user) {
      loadOrders();
    }
  }, [tab, user]);

  const loadOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders/${user.id}`);
      setOrders(res.data);
    } catch (err) {
      toast.error('Ошибка загрузки заказов');
    }
  };

  // === ВАЛИДАЦИЯ ТОВАРА ===
  const validateProduct = () => {
    const err = {};
    if (!form.product_name?.trim()) err.product_name = 'Название обязательно';
    else if (form.product_name.trim().length < 2) err.product_name = 'Минимум 2 символа';

    if (!form.base_price) err.base_price = 'Цена обязательна';
    else if (isNaN(form.base_price) || form.base_price <= 0) err.base_price = 'Цена должна быть > 0';

    if (!form.category_id) err.category_id = 'Выберите категорию';

    if (form.stock_quantity !== '' && (isNaN(form.stock_quantity) || form.stock_quantity < 0)) {
      err.stock_quantity = 'Количество ≥ 0';
    }

    setErrors(prev => ({ ...prev, ...err }));
    return Object.keys(err).length === 0;
  };

  // === ВАЛИДАЦИЯ КАТЕГОРИИ ===
  const validateCategory = () => {
    const err = {};
    if (!categoryForm.category_name?.trim()) err.category_name = 'Название обязательно';
    else if (categoryForm.category_name.trim().length < 2) err.category_name = 'Минимум 2 символа';
    setErrors(prev => ({ ...prev, ...err }));
    return Object.keys(err).length === 0;
  };

  // === ВАЛИДАЦИЯ СКИДКИ ===
  const validateDiscount = () => {
    const err = {};
    if (!discountForm.user_id) err.user_id = 'Выберите пользователя';
    if (discountForm.personal_discount === '') err.personal_discount = 'Укажите скидку';
    else if (isNaN(discountForm.personal_discount) || discountForm.personal_discount < 0 || discountForm.personal_discount > 100) {
      err.personal_discount = 'Скидка 0–100%';
    }
    setErrors(prev => ({ ...prev, ...err }));
    return Object.keys(err).length === 0;
  };

  // === ТОВАРЫ ===
  const handleProductInput = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const submitProduct = async () => {
    if (!validateProduct()) return;

    try {
      const config = { headers: { 'user-email': user.email } };
      const data = {
        ...form,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        base_price: parseFloat(form.base_price)
      };

      if (editing) {
        await axios.put(`${API}/products/${editing}`, data, config);
        toast.success('Товар обновлён');
      } else {
        await axios.post(`${API}/products`, data, config);
        toast.success('Товар добавлен');
      }

      resetProductForm();
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const resetProductForm = () => {
    setForm({ product_name: '', description: '', base_price: '', category_id: '', image_url: '', stock_quantity: 0 });
    setEditing(null);
    setErrors({});
  };

  const editProduct = (p) => {
    setForm({
      product_name: p.product_name,
      description: p.description || '',
      base_price: p.base_price,
      category_id: p.category_id,
      image_url: p.image_url || '',
      stock_quantity: p.stock_quantity
    });
    setEditing(p.product_id);
    setErrors({});
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Удалить товар?')) return;
    try {
      await axios.delete(`${API}/products/${id}`, { headers: { 'user-email': user.email } });
      toast.success('Товар удалён');
      loadAll();
    } catch (err) {
      toast.error('Ошибка удаления');
    }
  };

  // === КАТЕГОРИИ ===
  const submitCategory = async () => {
    if (!validateCategory()) return;

    try {
      const config = { headers: { 'user-email': user.email } };
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory}`, categoryForm, config);
        toast.success('Категория обновлена');
      } else {
        await axios.post(`${API}/categories`, categoryForm, config);
        toast.success('Категория добавлена');
      }

      setCategoryForm({ category_name: '' });
      setEditingCategory(null);
      setErrors({});
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const editCategory = (c) => {
    setCategoryForm({ category_name: c.category_name });
    setEditingCategory(c.category_id);
    setErrors({});
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Удалить категорию?')) return;
    try {
      await axios.delete(`${API}/categories/${id}`, { headers: { 'user-email': user.email } });
      toast.success('Категория удалена');
      loadAll();
    } catch (err) {
      toast.error('Ошибка удаления');
    }
  };

  // === СКИДКИ ===
  const submitDiscount = async () => {
    if (!validateDiscount()) return;

    try {
      await axios.put(`${API}/users/discount`, {
        user_id: parseInt(discountForm.user_id),
        personal_discount: parseInt(discountForm.personal_discount)
      }, { headers: { 'user-email': user.email } });

      toast.success('Скидка установлена');
      setDiscountForm({ user_id: '', personal_discount: '' });
      setErrors({});
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  // === ПРОФИЛЬ ===
  if (tab === 'profile') {
    return (
      <div className="dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <div className="user-info">
              <h2>Личный кабинет</h2>
              <p>{user?.email || 'Загрузка...'}</p>
            </div>
            <button className="back-btn" onClick={logout}>Выйти</button>
          </div>

          <div className="tabs">
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
              Профиль
            </button>
            <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
              Мои заказы
            </button>
            {isAdmin && (
              <>
                <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
                  Товары
                </button>
                <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
                  Категории
                </button>
                <button className={tab === 'discounts' ? 'active' : ''} onClick={() => setTab('discounts')}>
                  Скидки
                </button>
              </>
            )}
          </div>

          <div className="profile-section">
            <div className="profile-card">
              <h3>Информация о пользователе</h3>
              <p><strong>Email:</strong> {user?.email || '—'}</p>
              <p><strong>Роль:</strong> {isAdmin ? 'Администратор' : 'Пользователь'}</p>
              {user?.personal_discount > 0 && (
                <p><strong>Персональная скидка:</strong> {user.personal_discount}%</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === ЗАКАЗЫ ===
  if (tab === 'orders') {
    return (
      <div className="dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>Мои заказы</h2>
            <button className="back-btn" onClick={() => setTab('profile')}>Назад</button>
          </div>

          <div className="tabs">
            <button onClick={() => setTab('profile')}>Профиль</button>
            <button className="active">Мои заказы</button>
            {isAdmin && (
              <>
                <button onClick={() => setTab('products')}>Товары</button>
                <button onClick={() => setTab('categories')}>Категории</button>
                <button onClick={() => setTab('discounts')}>Скидки</button>
              </>
            )}
          </div>

          <div className="orders-section">
            {orders.length === 0 ? (
              <div className="empty-orders">
                <p>У вас пока нет заказов</p>
                <Link to="/" className="btn-primary">Перейти к покупкам</Link>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map(order => (
                  <div key={order.order_id} className="order-card">
                    <div className="order-header">
                      <h3>Заказ #{order.order_id}</h3>
                      <span className={`order-status ${order.status_name}`}>
                        {order.status_description}
                      </span>
                    </div>
                    
                    <div className="order-details">
                      <p><strong>Дата:</strong> {new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                      <p><strong>Сумма:</strong> {order.total_amount} ₽</p>
                      <p><strong>Статус:</strong> {order.status_name}</p>
                    </div>

                    {/* Добавляем список товаров */}
                    {order.items && order.items.length > 0 && (
                      <div className="order-items">
                        <h4>Товары:</h4>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-item">
                            <span>{item.product_name}</span>
                            <span>{item.quantity} шт. × {item.price} ₽</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === НЕ АДМИН ===
  if (!isAdmin && tab !== 'profile' && tab !== 'orders') {
    return (
      <div className="dashboard">
        <div className="dashboard-container">
          <div className="access-denied">
            <h2>Доступ запрещён</h2>
            <p>Только администраторы могут просматривать эту вкладку.</p>
            <button className="btn-primary" onClick={() => setTab('profile')}>Назад в профиль</button>
          </div>
        </div>
      </div>
    );
  }

  // === ТОВАРЫ ===
  if (tab === 'products') {
    return (
      <div className="dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>Управление товарами</h2>
            <button className="back-btn" onClick={() => setTab('profile')}>Назад</button>
          </div>

          <div className="tabs">
            <button onClick={() => setTab('profile')}>Профиль</button>
            <button onClick={() => setTab('orders')}>Мои заказы</button>
            <button className="active">Товары</button>
            <button onClick={() => setTab('categories')}>Категории</button>
            <button onClick={() => setTab('discounts')}>Скидки</button>
          </div>

          <div className="admin-section">
            <h3>{editing ? 'Редактировать товар' : 'Добавить товар'}</h3>
            <div className="form-grid">
              <div>
                <input name="product_name" placeholder="Название *" value={form.product_name} onChange={handleProductInput} />
                {errors.product_name && <p className="error">{errors.product_name}</p>}
              </div>
              <div>
                <input name="base_price" type="number" step="0.01" placeholder="Цена *" value={form.base_price} onChange={handleProductInput} />
                {errors.base_price && <p className="error">{errors.base_price}</p>}
              </div>
              <div>
                <select name="category_id" value={form.category_id} onChange={handleProductInput}>
                  <option value="">Категория *</option>
                  {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
                {errors.category_id && <p className="error">{errors.category_id}</p>}
              </div>
              <div>
                <input name="image_url" placeholder="URL изображения" value={form.image_url} onChange={handleProductInput} />
              </div>
              <div>
                <input name="stock_quantity" type="number" placeholder="Количество" value={form.stock_quantity} onChange={handleProductInput} />
                {errors.stock_quantity && <p className="error">{errors.stock_quantity}</p>}
              </div>
              <div>
                <textarea name="description" placeholder="Описание" value={form.description} onChange={handleProductInput} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primary" onClick={submitProduct}>
                {editing ? 'Обновить' : 'Добавить'}
              </button>
              {editing && (
                <button className="btn-secondary" onClick={resetProductForm}>
                  Отмена
                </button>
              )}
            </div>

            <div className="admin-list">
              {products.map(p => (
                <div key={p.product_id} className="admin-item">
                  <div>
                    <strong>{p.product_name}</strong>
                    <p>{p.base_price} ₽ • {p.stock_quantity} шт.</p>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => editProduct(p)}>Изменить</button>
                    <button className="btn-danger" onClick={() => deleteProduct(p.product_id)}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === КАТЕГОРИИ ===
  if (tab === 'categories') {
    return (
      <div className="dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>Управление категориями</h2>
            <button className="back-btn" onClick={() => setTab('profile')}>Назад</button>
          </div>

          <div className="tabs">
            <button onClick={() => setTab('profile')}>Профиль</button>
            <button onClick={() => setTab('orders')}>Мои заказы</button>
            <button onClick={() => setTab('products')}>Товары</button>
            <button className="active">Категории</button>
            <button onClick={() => setTab('discounts')}>Скидки</button>
          </div>

          <div className="admin-section">
            <h3>{editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}</h3>
            <div className="form-grid">
              <div>
                <input
                  value={categoryForm.category_name}
                  onChange={(e) => {
                    setCategoryForm({ category_name: e.target.value });
                    setErrors(prev => ({ ...prev, category_name: '' }));
                  }}
                  placeholder="Название категории *"
                />
                {errors.category_name && <p className="error">{errors.category_name}</p>}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primary" onClick={submitCategory}>
                {editingCategory ? 'Обновить' : 'Добавить'}
              </button>
              {editingCategory && (
                <button className="btn-secondary" onClick={() => {
                  setCategoryForm({ category_name: '' });
                  setEditingCategory(null);
                  setErrors({});
                }}>
                  Отмена
                </button>
              )}
            </div>

            <div className="admin-list">
              {categories.map(c => (
                <div key={c.category_id} className="admin-item">
                  <div>
                    <strong>{c.category_name}</strong>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => editCategory(c)}>Изменить</button>
                    <button className="btn-danger" onClick={() => deleteCategory(c.category_id)}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === СКИДКИ ===
  if (tab === 'discounts') {
    return (
      <div className="dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>Управление скидками</h2>
            <button className="back-btn" onClick={() => setTab('profile')}>Назад</button>
          </div>

          <div className="tabs">
            <button onClick={() => setTab('profile')}>Профиль</button>
            <button onClick={() => setTab('orders')}>Мои заказы</button>
            <button onClick={() => setTab('products')}>Товары</button>
            <button onClick={() => setTab('categories')}>Категории</button>
            <button className="active">Скидки</button>
          </div>

          <div className="admin-section">
            <h3>Установить персональную скидку</h3>
            <div className="form-grid">
              <div>
                <select
                  value={discountForm.user_id}
                  onChange={(e) => {
                    setDiscountForm(prev => ({ ...prev, user_id: e.target.value }));
                    setErrors(prev => ({ ...prev, user_id: '' }));
                  }}
                >
                  <option value="">Выберите пользователя</option>
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.email} ({u.personal_discount || 0}%)
                    </option>
                  ))}
                </select>
                {errors.user_id && <p className="error">{errors.user_id}</p>}
              </div>
              <div>
                <input
                  type="number"
                  value={discountForm.personal_discount}
                  onChange={(e) => {
                    setDiscountForm(prev => ({ ...prev, personal_discount: e.target.value }));
                    setErrors(prev => ({ ...prev, personal_discount: '' }));
                  }}
                  placeholder="Скидка % (0–100)"
                />
                {errors.personal_discount && <p className="error">{errors.personal_discount}</p>}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primary" onClick={submitDiscount}>
                Установить
              </button>
            </div>

            <div className="admin-list">
              <h3>Текущие скидки</h3>
              {users.map(u => (
                <div key={u.user_id} className="admin-item">
                  <div>
                    <strong>{u.email}</strong>
                    <p>Скидка: {u.personal_discount || 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Dashboard;