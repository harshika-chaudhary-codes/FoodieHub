
const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('Missing Supabase environment variables.');
}

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://olzxzswoechbhumlhpss.supabase.co',
  process.env.SUPABASE_SECRET_KEY || 'missing-secret-key'
);

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

function cleanText(value, maxLength = 250) {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength)
    : '';
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && email.length <= 254;
}

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'FoodieHub API'
  });
});

// Menu
app.get('/api/menu', (_req, res) => {
  res.json({ items: MENU });
});

// Fetch orders from Supabase
app.get('/api/orders', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, order_code, order_date, customer_name, customer_phone, delivery_address, items, subtotal, delivery_fee, discount, total, payment_method, payment_label, status, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error.message);
      return res.status(500).json({
        error: 'Unable to fetch orders.'
      });
    }

    res.json({ orders: data || [] });
  } catch (error) {
    console.error('Orders fetch error:', error.message);

    res.status(500).json({
      error: 'Unable to fetch orders.'
    });
  }
});

// Place a new order
app.post('/api/orders', async (req, res) => {
  try {
    const body = req.body || {};
    const customer = body.customer || {};

    const name = cleanText(customer.name, 100);
    const phone = cleanText(customer.phone, 10);
    const address = cleanText(customer.address, 250);
    const city = cleanText(customer.city, 100);
    const pincode = cleanText(customer.pincode, 6);
    const email = cleanText(customer.email, 254).toLowerCase();
    const paymentMethod = cleanText(body.paymentMethod, 10).toLowerCase();
    const items = body.items;

    if (name.length < 2) {
      return res.status(400).json({
        error: 'Please enter a valid customer name.'
      });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        error: 'Please enter a valid 10-digit Indian mobile number.'
      });
    }

    if (
      address.length < 8 ||
      city.length < 2 ||
      !/^\d{6}$/.test(pincode)
    ) {
      return res.status(400).json({
        error: 'Please check your address, city and pincode.'
      });
    }

    if (!['cod', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({
        error: 'Please select a supported demo payment method.'
      });
    }

    if (email && !validEmail(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.'
      });
    }

    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > MENU.length
    ) {
      return res.status(400).json({
        error: 'Your cart is empty or invalid.'
      });
    }

    const seen = new Set();
    const pricedItems = [];

    for (const item of items) {
      const id = Number(item && item.id);
      const quantity = Number(item && item.quantity);
      const menuItem = MENU.find(food => food.id === id);

      if (
        !menuItem ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99 ||
        seen.has(id)
      ) {
        return res.status(400).json({
          error: 'One or more cart items are invalid. Please refresh the menu.'
        });
      }

      seen.add(id);

      pricedItems.push({
        id,
        name: menuItem.name,
        quantity,
        unitPrice: menuItem.price
      });
    }

    const subtotal = pricedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const couponCode = cleanText(body.couponCode, 20).toUpperCase();

    const discount = couponCode === 'FOODIE10'
      ? Math.round(subtotal * 0.1)
      : 0;

    const deliveryFee = subtotal > 0 && subtotal < 499 ? 35 : 0;
    const total = Math.max(0, subtotal - discount + deliveryFee);

    const now = new Date();

    const orderCode =
      `FH-${now.getTime().toString().slice(-7)}-${crypto.randomInt(10, 100)}`;

    const paymentLabel = paymentMethod === 'upi'
      ? 'UPI Demo (not processed)'
      : 'Cash on Delivery (demo)';

    const orderRecord = {
      order_code: orderCode,
      order_date: now.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      customer_name: name,
      customer_email: email || null,
      customer_phone: phone,
      delivery_address: `${address}, ${city} - ${pincode}`,
      items: pricedItems,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total,
      payment_method: paymentMethod,
      payment_label: paymentLabel,
      status: 'Demo saved'
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(orderRecord)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);

      return res.status(500).json({
        error: 'Your order could not be saved. Please try again.'
      });
    }

    const order = {
      id: data.order_code,
      date: data.order_date,
      customer: data.customer_name,
      phone: data.customer_phone,
      address: data.delivery_address,
      paymentLabel: data.payment_label,
      items: data.items,
      subtotal: Number(data.subtotal),
      delivery: Number(data.delivery_fee),
      discount: Number(data.discount),
      total: Number(data.total),
      status: data.status
    };

    res.status(201).json({
      message: 'Demo order saved successfully.',
      order
    });
  } catch (error) {
    console.error('Place order error:', error.message);

    res.status(500).json({
      error: 'An unexpected server error occurred.'
    });
  }
});

// Newsletter subscription
app.post('/api/newsletter', async (req, res) => {
  const email = cleanText(
    req.body && req.body.email,
    254
  ).toLowerCase();

  if (!validEmail(email)) {
    return res.status(400).json({
      error: 'Please enter a valid email address.'
    });
  }

  try {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email });

    if (error) {
      if (error.code === '23505') {
        return res.json({
          message: 'This email is already subscribed.'
        });
      }

      console.error('Newsletter error:', error.message);

      return res.status(500).json({
        error: 'Unable to save your subscription.'
      });
    }

    res.status(201).json({
      message: 'Thanks for subscribing!'
    });
  } catch (error) {
    console.error('Newsletter error:', error.message);

    res.status(500).json({
      error: 'Unable to save your subscription.'
    });
  }
});

// Serve frontend files
app.use(express.static(ROOT, { extensions: ['html'] }));

// Error handler
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON request.'
    });
  }

  console.error(err);

  res.status(500).json({
    error: 'An unexpected server error occurred.'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FoodieHub backend is running at http://localhost:${PORT}`);
  });
}

module.exports = app;


