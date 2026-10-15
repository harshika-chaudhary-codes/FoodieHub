const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');

const MENU = [
  { id: 1, name: 'Margherita Pizza', category: 'Pizza', price: 249 },
  { id: 2, name: 'Farmhouse Pizza', category: 'Pizza', price: 329 },
  { id: 3, name: 'Classic Veg Burger', category: 'Burgers', price: 159 },
  { id: 4, name: 'Crispy Chicken Burger', category: 'Burgers', price: 219 },
  { id: 5, name: 'Hyderabadi Biryani', category: 'Indian', price: 289 },
  { id: 6, name: 'Paneer Tikka', category: 'Indian', price: 229 },
  { id: 7, name: 'Masala Dosa', category: 'Indian', price: 139 },
  { id: 8, name: 'Veg Hakka Noodles', category: 'Chinese', price: 179 },
  { id: 9, name: 'White Sauce Pasta', category: 'Chinese', price: 229 },
  { id: 10, name: 'French Fries', category: 'Burgers', price: 99 },
  { id: 11, name: 'Chocolate Brownie', category: 'Desserts', price: 119 },
  { id: 12, name: 'Chocolate Lava Cake', category: 'Desserts', price: 149 },
  { id: 13, name: 'Gulab Jamun', category: 'Desserts', price: 89 },
  { id: 14, name: 'Cold Coffee', category: 'Beverages', price: 129 },
  { id: 15, name: 'Mango Shake', category: 'Beverages', price: 139 },
  { id: 16, name: 'Tandoori Momos', category: 'Indian', price: 189 }
];

function ensureJsonFile(file, initialValue) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(initialValue, null, 2));
}
function readJson(file, fallback) {
  ensureJsonFile(file, fallback);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, value) {
  ensureJsonFile(file, []);
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, file);
}
function cleanText(value, maxLength = 250) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'FoodieHub API' }));
app.get('/api/menu', (_req, res) => res.json({ items: MENU }));

app.get('/api/orders', (_req, res) => {
  const orders = readJson(ORDERS_FILE, []);
  res.json({ orders: Array.isArray(orders) ? orders : [] });
});

app.post('/api/orders', (req, res) => {
  const body = req.body || {};
  const customer = body.customer || {};
  const name = cleanText(customer.name, 100);
  const phone = cleanText(customer.phone, 10);
  const address = cleanText(customer.address, 250);
  const city = cleanText(customer.city, 100);
  const pincode = cleanText(customer.pincode, 6);
  const paymentMethod = cleanText(body.paymentMethod, 10);
  const items = body.items;

  if (name.length < 2) return res.status(400).json({ error: 'Please enter a valid customer name.' });
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  if (address.length < 8 || city.length < 2 || !/^\d{6}$/.test(pincode)) return res.status(400).json({ error: 'Please check the delivery address, city, and 6-digit pincode.' });
  if (!['cod', 'upi'].includes(paymentMethod)) return res.status(400).json({ error: 'Please select a supported demo payment method.' });
  if (!Array.isArray(items) || items.length < 1 || items.length > MENU.length) return res.status(400).json({ error: 'Your cart is empty or invalid.' });

  const seen = new Set();
  const pricedItems = [];
  for (const item of items) {
    const id = Number(item && item.id);
    const quantity = Number(item && item.quantity);
    const menuItem = MENU.find(food => food.id === id);
    if (!menuItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || seen.has(id)) {
      return res.status(400).json({ error: 'One or more cart items are invalid. Please refresh the menu and try again.' });
    }
    seen.add(id);
    pricedItems.push({ id, name: menuItem.name, quantity, unitPrice: menuItem.price });
  }

  const subtotal = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const couponCode = cleanText(body.couponCode, 20).toUpperCase();
  const discount = couponCode === 'FOODIE10' ? Math.round(subtotal * 0.1) : 0;
  const delivery = subtotal > 0 && subtotal < 499 ? 35 : 0;
  const total = Math.max(0, subtotal - discount + delivery);
  const now = new Date();
  const order = {
    id: `FH-${now.getTime().toString().slice(-7)}-${crypto.randomInt(10, 100)}`,
    date: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    customer: name,
    phone,
    address: `${address}, ${city} - ${pincode}`,
    paymentLabel: paymentMethod === 'upi' ? 'UPI Demo (not processed)' : 'Cash on Delivery (demo)',
    items: pricedItems,
    subtotal,
    delivery,
    discount,
    total,
    status: 'Demo saved'
  };

  const orders = readJson(ORDERS_FILE, []);
  orders.unshift(order);
  writeJson(ORDERS_FILE, orders.slice(0, 500));
  res.status(201).json({ message: 'Demo order saved successfully.', order });
});

app.post('/api/newsletter', (req, res) => {
  const email = cleanText(req.body && req.body.email, 254).toLowerCase();
  if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const subscribers = readJson(SUBSCRIBERS_FILE, []);
  if (subscribers.some(entry => entry.email === email)) {
    return res.json({ message: 'This email is already subscribed.' });
  }
  subscribers.push({ email, subscribedAt: new Date().toISOString() });
  writeJson(SUBSCRIBERS_FILE, subscribers);
  res.status(201).json({ message: 'Thanks for subscribing! Your demo subscription was saved.' });
});

app.use(express.static(ROOT, { extensions: ['html'] }));
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Invalid JSON request.' });
  console.error(err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

if (require.main === module) {
  ensureJsonFile(ORDERS_FILE, []);
  ensureJsonFile(SUBSCRIBERS_FILE, []);

  app.listen(PORT, () => {
    console.log(`FoodieHub backend is running at http://localhost:${PORT}`);
  });
}

module.exports = app;