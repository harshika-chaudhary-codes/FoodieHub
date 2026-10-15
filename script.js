'use strict';

// FoodieHub is a frontend-only demo. Orders and preferences stay in this browser.
const STORAGE_KEYS = { cart: 'foodiehub_cart_v1', favorites: 'foodiehub_favorites_v1', theme: 'foodiehub_theme_v1', orders: 'foodiehub_orders_v1' };
const DELIVERY_FEE = 35;
const FREE_DELIVERY_THRESHOLD = 499;
const COUPON_CODE = 'FOODIE10';
const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
const imageUrl = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;
const foodItems = [
  {id:1,name:'Margherita Pizza',category:'Pizza',price:249,rating:4.8,time:20,badge:'Bestseller',description:'Classic cheese, basil and tangy tomato sauce.',image:imageUrl('photo-1579751626657-72bc17010498')},
  {id:2,name:'Farmhouse Pizza',category:'Pizza',price:329,rating:4.7,time:25,badge:'Fan favourite',description:'Loaded with peppers, onion, mushrooms and cheese.',image:imageUrl('photo-1513104890138-7c749659a591')},
  {id:3,name:'Classic Veg Burger',category:'Burgers',price:159,rating:4.6,time:15,badge:'Popular',description:'Crispy veggie patty with lettuce and house sauce.',image:imageUrl('photo-1568901346375-23c9450c58cd')},
  {id:4,name:'Crispy Chicken Burger',category:'Burgers',price:219,rating:4.7,time:18,badge:'Crowd pleaser',description:'Crunchy chicken, fresh lettuce and creamy mayo.',image:imageUrl('photo-1606755962773-d324e0a13086')},
  {id:5,name:'Hyderabadi Biryani',category:'Indian',price:289,rating:4.9,time:25,badge:'Chef special',description:'Aromatic basmati rice with warming Indian spices.',image:'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=85',fallback:'assets/hyderabadi-biryani.svg'},
  {id:6,name:'Paneer Tikka',category:'Indian',price:229,rating:4.8,time:20,badge:'Veg favourite',description:'Smoky paneer cubes marinated in spiced yoghurt.',image:imageUrl('photo-1567188040759-fb8a883dc6d8')},
  {id:7,name:'Masala Dosa',category:'Indian',price:139,rating:4.6,time:18,badge:'South Indian',description:'Golden crisp dosa served with chutneys and sambar.',image:imageUrl('photo-1668236543090-82eba5ee5976')},
  {id:8,name:'Veg Hakka Noodles',category:'Chinese',price:179,rating:4.5,time:15,badge:'Quick bite',description:'Wok-tossed noodles with crunchy vegetables.',image:imageUrl('photo-1585032226651-759b368d7246')},
  {id:9,name:'White Sauce Pasta',category:'Chinese',price:229,rating:4.7,time:20,badge:'Creamy pick',description:'Creamy garlic sauce, herbs and parmesan-style cheese.',image:imageUrl('photo-1473093295043-cdd812d0e601')},
  {id:10,name:'French Fries',category:'Burgers',price:99,rating:4.4,time:10,badge:'Snack time',description:'Golden, crispy fries with a pinch of seasoning.',image:imageUrl('photo-1573080496219-bb080dd4f877')},
  {id:11,name:'Chocolate Brownie',category:'Desserts',price:119,rating:4.8,time:10,badge:'Sweet treat',description:'Rich chocolate brownie with a soft, fudgy centre.',image:imageUrl('photo-1606313564200-e75d5e30476c')},
  {id:12,name:'Chocolate Lava Cake',category:'Desserts',price:149,rating:4.9,time:12,badge:'Top rated',description:'Warm chocolate cake with a gooey centre.',image:imageUrl('photo-1624353365286-3f8d62daad51')},
  {id:13,name:'Gulab Jamun',category:'Desserts',price:89,rating:4.6,time:8,badge:'Classic',description:'Soft milk-solid dumplings in fragrant sugar syrup.',image:'assets/gulab-jamun.jpg',fallback:'assets/gulab-jamun.jpg'},
  {id:14,name:'Cold Coffee',category:'Beverages',price:129,rating:4.5,time:8,badge:'Chilled',description:'Smooth iced coffee blended until delightfully frothy.',image:imageUrl('photo-1461023058943-07fcbe16d735')},
  {id:15,name:'Mango Shake',category:'Beverages',price:139,rating:4.7,time:8,badge:'Seasonal joy',description:'A creamy mango shake with a sunny fruity flavour.',image:imageUrl('photo-1622597467836-f3285f2131b8')},
  {id:16,name:'Tandoori Momos',category:'Indian',price:189,rating:4.7,time:18,badge:'Spicy favourite',description:'Juicy dumplings tossed in a smoky tandoori marinade.',image:imageUrl('photo-1625220194771-7ebdea0b70b9')}
];

// Dietary labels are demo metadata; confirm ingredients with a restaurant in a real ordering system.
foodItems.forEach(item => { item.isVeg = ![4, 5].includes(item.id); });

let cart = readStorage(STORAGE_KEYS.cart, []);
let favorites = readStorage(STORAGE_KEYS.favorites, []);
let orders = readStorage(STORAGE_KEYS.orders, []);
let activeCategory = 'All Foods';
let searchTerm = '';
let sortMode = 'default';
let vegOnly = false;
let couponApplied = false;
let lastOrderId = '';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function readStorage(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch (error) { console.warn(`Could not read ${key} from LocalStorage.`, error); return fallback; }
}
function saveStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { showToast('Your browser could not save this change.', true); console.warn(error); }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function getFood(id) { return foodItems.find(item => item.id === Number(id)); }
function cartQuantity(id) { return cart.find(item => item.id === Number(id))?.quantity || 0; }
function itemCount() { return cart.reduce((total, item) => total + item.quantity, 0); }
function subtotal() { return cart.reduce((total, item) => total + (getFood(item.id)?.price || 0) * item.quantity, 0); }
function discountAmount() { return couponApplied ? Math.round(subtotal() * 0.1) : 0; }
function deliveryAmount() { return cart.length && subtotal() < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0; }
function totalAmount() { return Math.max(0, subtotal() - discountAmount() + deliveryAmount()); }
function persistCart() { saveStorage(STORAGE_KEYS.cart, cart); }
function persistFavorites() { saveStorage(STORAGE_KEYS.favorites, favorites); }
function persistOrders() { saveStorage(STORAGE_KEYS.orders, orders); }

function foodCard(item) {
  const favourite = favorites.includes(item.id);
  const quantity = cartQuantity(item.id);
  return `<article class="food-card" data-food-id="${item.id}">
    <div class="food-image-wrap"><img class="food-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" data-food-image="${item.id}" data-fallback="${escapeHtml(item.fallback || `assets/food-fallback-${item.id}.svg`)}"><span class="food-badge">${escapeHtml(item.badge)}</span><span class="diet-badge ${item.isVeg ? 'veg' : 'nonveg'}" title="${item.isVeg ? 'Vegetarian demo label' : 'Non-vegetarian demo label'}"><i></i>${item.isVeg ? 'Veg' : 'Non-veg'}</span><button class="favorite-btn ${favourite ? 'is-favorite' : ''}" data-action="favorite" data-id="${item.id}" aria-label="${favourite ? 'Remove' : 'Add'} ${escapeHtml(item.name)} ${favourite ? 'from' : 'to'} favorites" aria-pressed="${favourite}"><i class="${favourite ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button><button class="quick-view-btn" data-action="quick-view" data-id="${item.id}" aria-label="Quick view ${escapeHtml(item.name)}"><i class="fa-regular fa-eye"></i><span>Quick view</span></button></div>
    <div class="food-content"><div class="food-meta"><h3>${escapeHtml(item.name)}</h3><span class="rating"><i class="fa-solid fa-star"></i> ${item.rating.toFixed(1)}</span></div><p class="food-description">${escapeHtml(item.description)}</p><div class="food-card-bottom"><div class="food-price">${money(item.price)} <small>/ item</small></div><button class="add-btn" data-action="add" data-id="${item.id}" aria-label="Add ${escapeHtml(item.name)} to cart">${quantity ? `<span>${quantity}</span>` : '<i class="fa-solid fa-plus"></i>'}</button></div><div class="prep-time"><i class="fa-regular fa-clock"></i> ${item.time} min <span>·</span> ${escapeHtml(item.category)}</div></div></article>`;
}
function attachImageFallbacks(root = document) {
  root.querySelectorAll('img').forEach(img => {
    if (img.dataset.fallbackBound) return;
    img.dataset.fallbackBound = 'true';
    img.addEventListener('error', () => {
      const itemId = Number(img.dataset.foodImage);
      // If a remote image host fails, show a guaranteed project-local fallback.
      // Mark the fallback before changing src to prevent an error loop.
      if (img.dataset.localFallbackUsed === 'true') {
        img.onerror = null;
        return;
      }
      img.dataset.localFallbackUsed = 'true';
      img.onerror = null;
      img.src = img.dataset.fallback || (itemId ? `assets/food-fallback-${itemId}.svg` : 'assets/food-fallback.svg');
    }, { once: true });
  });
}
function openQuickView(id) {
  const item = getFood(id);
  if (!item) return;
  $('#quickViewContent').innerHTML = `
    <div class="quick-view-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" data-food-image="${item.id}" data-fallback="${escapeHtml(item.fallback || `assets/food-fallback-${item.id}.svg`)}"><span class="food-badge">${escapeHtml(item.badge)}</span></div>
    <div class="quick-view-details">
      <div class="quick-view-meta"><span class="rating"><i class="fa-solid fa-star"></i> ${item.rating.toFixed(1)}</span><span class="quick-view-diet ${item.isVeg ? 'veg' : 'nonveg'}">${item.isVeg ? '● Vegetarian' : '● Non-vegetarian'}</span><span><i class="fa-regular fa-clock"></i> ${item.time} min</span></div>
      <h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p>
      <div class="quick-view-bottom"><strong>${money(item.price)}</strong><button class="btn btn-primary" data-action="add" data-id="${item.id}"><i class="fa-solid fa-plus"></i> Add to cart</button></div>
      <button class="quick-view-favorite" data-action="favorite" data-id="${item.id}"><i class="fa-${favorites.includes(item.id) ? 'solid' : 'regular'} fa-heart"></i> ${favorites.includes(item.id) ? 'Saved to favorites' : 'Add to favorites'}</button>
    </div>`;
  attachImageFallbacks($('#quickViewContent'));
  openModal('quickViewModal');
}
function renderMenu() {
  let filtered = foodItems.filter(item => (activeCategory === 'All Foods' || item.category === activeCategory) && (!vegOnly || item.isVeg) && `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(searchTerm.toLowerCase()));
  if (sortMode === 'price-asc') filtered.sort((a,b) => a.price-b.price);
  if (sortMode === 'price-desc') filtered.sort((a,b) => b.price-a.price);
  if (sortMode === 'rating') filtered.sort((a,b) => b.rating-a.rating);
  $('#foodGrid').innerHTML = filtered.length ? filtered.map(foodCard).join('') : `<div class="empty-results"><i class="fa-solid fa-magnifying-glass"></i><strong>No dishes found</strong><p>Try a different search or choose another category.</p><button class="btn btn-secondary" data-action="clear-search">Clear filters</button></div>`;
  $('#searchFeedback').textContent = searchTerm ? `${filtered.length} result${filtered.length === 1 ? '' : 's'} for “${searchTerm}”${vegOnly ? ' · vegetarian only' : ''}` : (vegOnly ? `Showing ${filtered.length} vegetarian dishes` : '');
  $$('.category-chip').forEach(button => button.classList.toggle('active', button.dataset.category === activeCategory));
  attachImageFallbacks($('#foodGrid'));
}
function renderPopular() {
  const popular = [...foodItems].sort((a,b) => b.rating-a.rating).slice(0,3);
  $('#popularGrid').innerHTML = popular.map(item => `<article class="popular-card"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" data-food-image="${item.id}" data-fallback="${escapeHtml(item.fallback || `assets/food-fallback-${item.id}.svg`)}"><div><span class="rating"><i class="fa-solid fa-star"></i> ${item.rating.toFixed(1)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><span class="popular-price">${money(item.price)}</span></div><button class="popular-add" data-action="add" data-id="${item.id}" aria-label="Add ${escapeHtml(item.name)} to cart"><i class="fa-solid fa-plus"></i></button></article>`).join('');
  attachImageFallbacks($('#popularGrid'));
}
function renderFavorites() {
  const items = favorites.map(getFood).filter(Boolean);
  $('#favoritesGrid').innerHTML = items.map(foodCard).join('');
  $('#favoritesEmpty').classList.toggle('visible', items.length === 0);
  $('#favoritesGrid').style.display = items.length ? 'grid' : 'none';
  attachImageFallbacks($('#favoritesGrid'));
}
function renderCart() {
  const count = itemCount();
  $('#cartCount').textContent = count;
  $('#drawerItemCount').textContent = `(${count})`;
  $('#cartItems').innerHTML = cart.map(entry => {
    const item = getFood(entry.id); if (!item) return '';
    return `<div class="cart-item"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" data-food-image="${item.id}" data-fallback="${escapeHtml(item.fallback || `assets/food-fallback-${item.id}.svg`)}"><div><h3>${escapeHtml(item.name)}</h3><span class="cart-item-price">${money(item.price * entry.quantity)}</span><div class="quantity-control"><button data-action="decrease" data-id="${item.id}" aria-label="Decrease ${escapeHtml(item.name)} quantity">−</button><span>${entry.quantity}</span><button data-action="increase" data-id="${item.id}" aria-label="Increase ${escapeHtml(item.name)} quantity">+</button></div></div><button class="remove-item" data-action="remove" data-id="${item.id}" aria-label="Remove ${escapeHtml(item.name)} from cart"><i class="fa-regular fa-trash-can"></i></button></div>`;
  }).join('');
  $('#cartEmpty').classList.toggle('visible', count === 0);
  $('#cartItems').style.display = count ? 'block' : 'none';
  $('#cartBottom').classList.toggle('is-hidden', count === 0);
  $('#cartSubtotal').textContent = money(subtotal());
  $('#deliveryFee').textContent = deliveryAmount() === 0 && cart.length ? 'FREE' : money(deliveryAmount());
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal());
  $('#deliveryProgressText').textContent = !cart.length ? `Add food worth ${money(FREE_DELIVERY_THRESHOLD)} for free delivery` : remaining > 0 ? `Add ${money(remaining)} more for free delivery` : 'You unlocked free delivery!';
  $('#deliveryProgressBar').style.width = `${Math.min(100, subtotal() / FREE_DELIVERY_THRESHOLD * 100)}%`;
  $('#deliveryProgress').classList.toggle('unlocked', cart.length > 0 && remaining === 0);
  $('#cartDiscount').textContent = `−${money(discountAmount())}`;
  $('#discountLine').hidden = !couponApplied;
  $('#cartTotal').textContent = money(totalAmount());
  $('#couponMessage').textContent = couponApplied ? `Coupon ${COUPON_CODE} applied — 10% off food subtotal.` : 'Demo code: FOODIE10 for 10% off food subtotal.';
  $('#couponMessage').style.color = couponApplied ? 'var(--green)' : 'var(--muted)';
  attachImageFallbacks($('#cartItems'));
  updateCheckoutSummary();
}
function renderOrders() {
  const list = $('#ordersList');
  list.innerHTML = [...orders].reverse().map(order => `<article class="order-card"><div><small>DEMO ORDER</small><strong>${escapeHtml(order.id)}</strong><small>${escapeHtml(order.date)}</small></div><div class="order-items"><small>ITEMS</small><strong>${order.items.map(item => `${escapeHtml(item.name)} × ${item.quantity}`).join(', ')}</strong></div><div><small>TOTAL</small><strong>${money(order.total)}</strong><small>${escapeHtml(order.paymentLabel)}</small></div><div><span class="order-status"><i class="fa-solid fa-circle-check"></i> Demo saved</span><small>Not a real delivery</small></div></article>`).join('');
  $('#ordersEmpty').classList.toggle('visible', orders.length === 0);
  list.style.display = orders.length ? 'grid' : 'none';
}
function renderAll() { renderMenu(); renderPopular(); renderFavorites(); renderCart(); renderOrders(); }
function showToast(message, isError = false) {
  const toast = document.createElement('div'); toast.className = `toast${isError ? ' error' : ''}`;
  toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i><span>${escapeHtml(message)}</span>`;
  $('#toastRegion').appendChild(toast);
  window.setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)'; window.setTimeout(() => toast.remove(), 250); }, 2800);
}
function addToCart(id) {
  const item = getFood(id); if (!item) return;
  const existing = cart.find(entry => entry.id === item.id);
  if (existing) existing.quantity = Math.min(99, existing.quantity + 1); else cart.push({ id: item.id, quantity: 1 });
  persistCart(); renderCart(); renderMenu(); renderFavorites();
  showToast(`${item.name} added to your cart.`);
}
function changeQuantity(id, delta) {
  const entry = cart.find(item => item.id === Number(id)); if (!entry) return;
  entry.quantity += delta;
  if (entry.quantity <= 0) cart = cart.filter(item => item.id !== Number(id));
  else entry.quantity = Math.min(entry.quantity, 99);
  persistCart(); renderCart(); renderMenu(); renderFavorites();
}
function removeFromCart(id) {
  const item = getFood(id); cart = cart.filter(entry => entry.id !== Number(id));
  persistCart(); renderCart(); renderMenu(); renderFavorites();
  if (item) showToast(`${item.name} removed from your cart.`);
}
function toggleFavorite(id) {
  const item = getFood(id); if (!item) return;
  if (favorites.includes(item.id)) { favorites = favorites.filter(value => value !== item.id); showToast(`${item.name} removed from favorites.`); }
  else { favorites.push(item.id); showToast(`${item.name} saved to favorites.`); }
  persistFavorites(); renderMenu(); renderFavorites();
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  $('#themeToggle').innerHTML = `<i class="fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}"></i>`;
  $('#themeToggle').setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  saveStorage(STORAGE_KEYS.theme, theme);
}
function openCart() {
  $('#cartDrawer').classList.add('open'); $('#cartDrawer').setAttribute('aria-hidden','false'); $('#overlay').classList.add('visible'); document.body.classList.add('no-scroll'); $('#closeCart').focus();
}
function closeCart() {
  $('#cartDrawer').classList.remove('open'); $('#cartDrawer').setAttribute('aria-hidden','true');
  if (!$$('.modal-wrap.open').length) { $('#overlay').classList.remove('visible'); document.body.classList.remove('no-scroll'); }
}
function openModal(id) {
  closeCart(); const modal = document.getElementById(id); modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); $('#overlay').classList.add('visible'); document.body.classList.add('no-scroll');
  const focusable = modal.querySelector('input,button,select,textarea'); if (focusable) window.setTimeout(() => focusable.focus(), 60);
}
function closeModal(id) {
  const modal = document.getElementById(id); if (!modal) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
  if (!$$('.modal-wrap.open').length && !$('#cartDrawer').classList.contains('open')) { $('#overlay').classList.remove('visible'); document.body.classList.remove('no-scroll'); }
}
function updateCheckoutSummary() { $('#checkoutItemCount').textContent = itemCount(); $('#checkoutTotal').textContent = money(totalAmount()); }
function applyCoupon(event) {
  event.preventDefault(); const value = $('#couponInput').value.trim().toUpperCase();
  if (value === COUPON_CODE) { couponApplied = true; renderCart(); showToast('Coupon applied: 10% off your food subtotal.'); }
  else { couponApplied = false; renderCart(); $('#couponMessage').textContent = 'That code did not work. Try FOODIE10.'; $('#couponMessage').style.color = '#e34b5f'; showToast('Invalid coupon code. Try FOODIE10.', true); }
}
async function placeOrder(event) {
  event.preventDefault();
  if (!cart.length) { closeModal('checkoutModal'); showToast('Your cart is empty. Add a dish first.', true); return; }
  const form = $('#checkoutForm');
  if (!form.reportValidity()) return;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonHtml = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving order…';
  const data = new FormData(form);
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: String(data.get('customerName')).trim(),
          phone: String(data.get('customerPhone')).trim(),
          address: String(data.get('customerAddress')).trim(),
          city: String(data.get('customerCity')).trim(),
          pincode: String(data.get('customerPincode')).trim()
        },
        paymentMethod: String(data.get('paymentMethod')),
        items: cart.map(entry => ({ id: entry.id, quantity: entry.quantity })),
        couponCode: couponApplied ? COUPON_CODE : ''
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not save the order. Please try again.');
    const order = result.order;
    orders.push(order); persistOrders(); lastOrderId = order.id;
    cart = []; couponApplied = false; persistCart(); renderAll(); form.reset(); closeModal('checkoutModal');
    $('#successOrderId').textContent = order.id; openModal('successModal');
    showToast('Your demo order was saved by the backend.');
  } catch (error) {
    console.error('Order submission failed:', error);
    showToast(error.message || 'Backend connection failed. Make sure the server is running.', true);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonHtml;
  }
}
function clearSearch() { searchTerm = ''; $('#navSearch').value = ''; activeCategory = 'All Foods'; renderMenu(); }

// Delegated actions keep event handling reliable as food cards are re-rendered.
document.addEventListener('click', event => {
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const action = actionButton.dataset.action; const id = Number(actionButton.dataset.id);
    if (action === 'add') addToCart(id);
    if (action === 'favorite') toggleFavorite(id);
    if (action === 'increase') changeQuantity(id, 1);
    if (action === 'decrease') changeQuantity(id, -1);
    if (action === 'remove') removeFromCart(id);
    if (action === 'clear-search') clearSearch();
    if (action === 'quick-view') openQuickView(id);
  }
  const closeButton = event.target.closest('[data-close-modal]');
  if (closeButton) closeModal(closeButton.dataset.closeModal);
  const navLink = event.target.closest('#navLinks a');
  if (navLink) { $('#navLinks').classList.remove('open'); $('#menuToggle').setAttribute('aria-expanded','false'); }
});
$$('.category-chip').forEach(button => button.addEventListener('click', () => { activeCategory = button.dataset.category; renderMenu(); }));
$('#vegOnlyToggle').addEventListener('change', event => { vegOnly = event.target.checked; renderMenu(); showToast(vegOnly ? 'Showing vegetarian demo dishes.' : 'Showing all dishes.'); });
$('#navSearch').addEventListener('input', event => { searchTerm = event.target.value.trim(); if (searchTerm) activeCategory = 'All Foods'; renderMenu(); });
$('#sortSelect').addEventListener('change', event => { sortMode = event.target.value; renderMenu(); });
$('#openCart').addEventListener('click', openCart);
$('#footerCart').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#continueShopping').addEventListener('click', () => { closeCart(); $('#menu').scrollIntoView({behavior:'smooth'}); });
$('#overlay').addEventListener('click', () => { closeCart(); $$('.modal-wrap.open').forEach(modal => closeModal(modal.id)); });
$('#themeToggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$('#couponForm').addEventListener('submit', applyCoupon);
$('#checkoutButton').addEventListener('click', () => { if (!cart.length) { showToast('Add a dish to your cart before checkout.', true); return; } updateCheckoutSummary(); openModal('checkoutModal'); });
$('#checkoutForm').addEventListener('submit', placeOrder);
$('#viewOrdersButton').addEventListener('click', () => { closeModal('successModal'); $('#orders').scrollIntoView({behavior:'smooth'}); });
$('#menuToggle').addEventListener('click', () => { const open = $('#navLinks').classList.toggle('open'); $('#menuToggle').setAttribute('aria-expanded', String(open)); $('#menuToggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); $('#menuToggle').innerHTML = `<i class="fa-solid ${open ? 'fa-xmark' : 'fa-bars'}"></i>`; });
$('#newsletterForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#newsletterEmail');
  if (!input.reportValidity()) return;
  const button = event.target.querySelector('button[type="submit"]');
  const original = button.innerHTML;
  button.disabled = true;
  try {
    const response = await fetch('/api/newsletter', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.value.trim() })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Subscription could not be saved.');
    showToast(result.message || 'Thanks for subscribing!');
    event.target.reset();
  } catch (error) {
    console.error('Newsletter subscription failed:', error);
    showToast(error.message || 'Backend connection failed. Make sure the server is running.', true);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeCart(); $$('.modal-wrap.open').forEach(modal => closeModal(modal.id)); $('#navLinks').classList.remove('open'); $('#menuToggle').setAttribute('aria-expanded','false'); } });

// Basic validation feedback for the Indian phone and pincode fields.
$('#customerPhone').addEventListener('input', event => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10); });
$('#customerPincode').addEventListener('input', event => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6); });
$('#year').textContent = new Date().getFullYear();
const savedTheme = readStorage(STORAGE_KEYS.theme, 'light');
setTheme(savedTheme === 'dark' ? 'dark' : 'light');
// Normalise stale or invalid stored cart/favourites to known menu items.
cart = Array.isArray(cart) ? cart.filter(entry => getFood(entry.id) && Number.isInteger(entry.quantity) && entry.quantity > 0).map(entry => ({id:Number(entry.id),quantity:Math.min(99,entry.quantity)})) : [];
favorites = Array.isArray(favorites) ? [...new Set(favorites.map(Number).filter(id => getFood(id)))] : [];
orders = Array.isArray(orders) ? orders.filter(order => order && order.id && Array.isArray(order.items)) : [];
persistCart(); persistFavorites(); persistOrders();
renderAll();

// Orders are stored by the Node.js backend; LocalStorage remains a small offline fallback.
(async function loadBackendOrders() {
  try {
    const response = await fetch('/api/orders');
    if (!response.ok) return;
    const result = await response.json();
    if (Array.isArray(result.orders)) { orders = result.orders; persistOrders(); renderOrders(); }
  } catch (_) { /* Opened via Live Server or offline: keep local demo history. */ }
})();
