import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';
import './Dashboard.css'; // Импорт стилей

const API = 'http://localhost:3001/api';

const Dashboard = () => {
  const { user } = useCart();
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    product_name: '',
    description: '',
    duration: '',
    base_price: '',
    category_id: '',
    image_url: '',
    stock_quantity: 0
  });
  const [editing, setEditing] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ category_name: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [discountForm, setDiscountForm] = useState({ user_id: '', personal_discount: '' });

  useEffect(() => {
    if (user?.role_id === 2) loadAll();
  }, [user]);

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

  // === ТОВАРЫ ===
  const handleProductInput = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const submitProduct = async () => {
    if (!form.product_name || !form.base_price || !form.category_id) {
      toast.error('Заполните обязательные поля');
      return;
    }

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

      setForm({
        product_name: '',
        description: '',
        duration: '',
        base_price: '',
        category_id: '',
        image_url: '',
        stock_quantity: 0
      });
      setEditing(null);
      loadAll();
    } catch (err) {
      toast.error('Ошибка сохранения товара');
    }
  };

  const editProduct = (p) => {
    setForm({
      product_name: p.product_name,
      description: p.description || '',
      duration: p.duration || '',
      base_price: p.base_price,
      category_id: p.category_id,
      image_url: p.image_url || '',
      stock_quantity: p.stock_quantity
    });
    setEditing(p.product_id);
    setTab('products');
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Удалить товар?')) return;
    try {
      const config = { headers: { 'user-email': user.email } };
      await axios.delete(`${API}/products/${id}`, config);
      toast.success('Товар удалён');
      loadAll();
    } catch (err) {
      toast.error('Ошибка удаления');
    }
  };

  // === КАТЕГОРИИ ===
  const submitCategory = async () => {
    if (!categoryForm.category_name.trim()) {
      toast.error('Введите название');
      return;
    }

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
      loadAll();
    } catch (err) {
      toast.error('Ошибка сохранения категории');
    }
  };

  const editCategory = (c) => {
    setCategoryForm({ category_name: c.category_name });
    setEditingCategory(c.category_id);
    setTab('categories');
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Удалить категорию?')) return;
    try {
      const config = { headers: { 'user-email': user.email } };
      await axios.delete(`${API}/categories/${id}`, config);
      toast.success('Категория удалена');
      loadAll();
    } catch (err) {
      toast.error('Ошибка удаления');
    }
  };

  // === СКИДКИ ===
  const submitDiscount = async () => {
    if (!discountForm.user_id || discountForm.personal_discount === '') {
      toast.error('Выберите пользователя и скидку');
      return;
    }

    try {
      const config = { headers: { 'user-email': user.email } };
      await axios.put(`${API}/users/${discountForm.user_id}/discount`, {
        personal_discount: parseFloat(discountForm.personal_discount)
      }, config);
      toast.success('Скидка обновлена');
      setDiscountForm({ user_id: '', personal_discount: '' });
      loadAll();
    } catch (err) {
      toast.error('Ошибка обновления скидки');
    }
  };

  if (!user || user.role_id !== 2) {
    return (
      <div className="dashboard">
        <div className="access-denied">
          <h2>Доступ запрещён</h2>
          <p>Требуется роль администратора</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="user-info">
            <h2>Админ-панель</h2>
            <p>Добро пожаловать, {user.email}</p>
          </div>
          <button className="back-btn" onClick={() => window.history.back()}>
            Назад
          </button>
        </div>

        <div className="tabs">
          <button 
            className={tab === 'products' ? 'active' : ''} 
            onClick={() => setTab('products')}
          >
            Товары
          </button>
          <button 
            className={tab === 'categories' ? 'active' : ''} 
            onClick={() => setTab('categories')}
          >
            Категории
          </button>
          <button 
            className={tab === 'discounts' ? 'active' : ''} 
            onClick={() => setTab('discounts')}
          >
            Скидки
          </button>
        </div>

        <div className="dashboard-content">
          {/* === ТОВАРЫ === */}
          {tab === 'products' && (
            <div className="admin-section">
              <h3>{editing ? 'Редактировать товар' : 'Добавить товар'}</h3>
              <div className="form-grid">
                <input
                  name="product_name"
                  placeholder="Название"
                  value={form.product_name}
                  onChange={handleProductInput}
                />
                <textarea
                  name="description"
                  placeholder="Описание"
                  value={form.description}
                  onChange={handleProductInput}
                />
                <input
                  name="duration"
                  type="number"
                  placeholder="Длительность (дни)"
                  value={form.duration}
                  onChange={handleProductInput}
                />
                <input
                  name="base_price"
                  type="number"
                  step="0.01"
                  placeholder="Цена"
                  value={form.base_price}
                  onChange={handleProductInput}
                />
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleProductInput}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
                <input
                  name="image_url"
                  placeholder="URL изображения"
                  value={form.image_url}
                  onChange={handleProductInput}
                />
                <input
                  name="stock_quantity"
                  type="number"
                  placeholder="Количество на складе"
                  value={form.stock_quantity}
                  onChange={handleProductInput}
                />
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={submitProduct}>
                  {editing ? 'Сохранить' : 'Добавить'}
                </button>
                {editing && (
                  <button className="btn-secondary" onClick={() => {
                    setEditing(null);
                    setForm({
                      product_name: '',
                      description: '',
                      duration: '',
                      base_price: '',
                      category_id: '',
                      image_url: '',
                      stock_quantity: 0
                    });
                  }}>
                    Отмена
                  </button>
                )}
              </div>

              <div className="admin-list">
                {products.map(p => (
                  <div key={p.product_id} className="admin-item">
                    <div>
                      <strong>{p.product_name}</strong>
                      <p>{p.base_price} ₽ | В наличии: {p.stock_quantity}</p>
                    </div>
                    <div className="item-actions">
                      <button onClick={() => editProduct(p)}>Изменить</button>
                      <button className="btn-danger" onClick={() => deleteProduct(p.product_id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === КАТЕГОРИИ === */}
          {tab === 'categories' && (
            <div className="admin-section">
              <h3>{editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}</h3>
              <div className="form-group">
                <input
                  placeholder="Название категории"
                  value={categoryForm.category_name}
                  onChange={(e) => setCategoryForm({ category_name: e.target.value })}
                />
                <button className="btn-primary" onClick={submitCategory}>
                  {editingCategory ? 'Сохранить' : 'Добавить'}
                </button>
                {editingCategory && (
                  <button className="btn-secondary" onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ category_name: '' });
                  }}>
                    Отмена
                  </button>
                )}
              </div>

              <div className="admin-list">
                {categories.map(c => (
                  <div key={c.category_id} className="admin-item">
                    <span>{c.category_name}</span>
                    <div className="item-actions">
                      <button onClick={() => editCategory(c)}>Изменить</button>
                      <button className="btn-danger" onClick={() => deleteCategory(c.category_id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === СКИДКИ === */}
          {tab === 'discounts' && (
            <div className="admin-section">
              <h3>Персональные скидки</h3>
              <div className="form-group">
                <select
                  value={discountForm.user_id}
                  onChange={(e) => setDiscountForm(prev => ({ ...prev, user_id: e.target.value }))}
                >
                  <option value="">Выберите пользователя</option>
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.email} ({u.first_name} {u.last_name})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Скидка (%)"
                  value={discountForm.personal_discount}
                  onChange={(e) => setDiscountForm(prev => ({ ...prev, personal_discount: e.target.value }))}
                />
                <button className="btn-primary" onClick={submitDiscount}>
                  Установить
                </button>
              </div>

              <div className="admin-list">
                {users.map(u => (
                  <div key={u.user_id} className="admin-item">
                    <div>
                      <strong>{u.email}</strong>
                      <p>Скидка: {u.personal_discount}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;