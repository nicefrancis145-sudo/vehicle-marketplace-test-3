const { products } = window.STORE_CONFIG;

const cart = new Map();
const productGrid = document.querySelector('#product-grid');
const cartPanel = document.querySelector('#cart-panel');
const overlay = document.querySelector('#overlay');
const checkoutModal = document.querySelector('#checkout-modal');
const successModal = document.querySelector('#success-modal');
let activeCategory = 'All';
let searchTerm = '';
let sortMode = 'featured';
const confirmationSound = new Audio('sounds/order-confirmation.mp3');

function formatPrice(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: window.STORE_CONFIG.currency }).format(amount);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderCategoryFilters() {
  const categories = ['All', ...new Set(products.map((product) => product.category))];
  document.querySelector('#category-filters').innerHTML = categories.map((category) => `
    <button class="category-chip${category === activeCategory ? ' active' : ''}" data-category="${escapeHtml(category)}" type="button">
      ${category === 'All' ? 'All deals' : escapeHtml(category)}
    </button>`).join('');
}

function visibleProducts() {
  const searchTerms = searchTerm.split(/\s+/).filter(Boolean);
  const shown = products.filter((product) => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const searchableText = Object.values(product).join(' ').toLowerCase();
    const matchesSearch = searchTerms.every((term) => searchableText.includes(term));
    return matchesCategory && matchesSearch;
  });
  if (sortMode === 'price-low') shown.sort((first, second) => (first.price ?? Infinity) - (second.price ?? Infinity));
  if (sortMode === 'price-high') shown.sort((first, second) => (second.price ?? -Infinity) - (first.price ?? -Infinity));
  if (sortMode === 'newest') shown.sort((first, second) => (second.year || 0) - (first.year || 0));
  return shown;
}

function renderProducts() {
  const shown = visibleProducts();
  document.querySelector('#result-count').textContent = `${shown.length} ${shown.length === 1 ? 'item' : 'items'}`;
  document.querySelector('#empty-state').classList.toggle('hidden', shown.length > 0);
  productGrid.classList.toggle('hidden', shown.length === 0);
  productGrid.innerHTML = shown.map((product) => `
    <article class="product-card">
      <div class="product-image" style="--product-bg:${escapeHtml(product.bg)}">
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </div>
      <div class="product-info">
      <div class="listing-meta"><span class="product-category">${escapeHtml(product.category)}</span><span class="vehicle-year">${product.year ? escapeHtml(product.year) : 'Year unconfirmed'}</span></div>
        <h3>${escapeHtml(product.name)}</h3>
      <p class="vehicle-details">${escapeHtml(product.details)}</p>
      <p class="vehicle-location">⌖ ${escapeHtml(product.location)}</p>
      <div class="product-bottom"><span class="price">${product.purchasable === false ? 'Not for sale' : `${formatPrice(product.price)} <small>sample asking</small>`}</span>
        ${product.purchasable === false ? '<span class="not-for-sale">Tribute</span>' : `<button class="add-button" type="button" data-add="${escapeHtml(product.id)}" aria-label="Add ${escapeHtml(product.name)} demo listing to cart">+</button>`}
        </div>
      </div>
    </article>`).join('');
}

function cartContents() {
  return [...cart.entries()].map(([id, quantity]) => ({
    product: products.find((product) => product.id === id),
    quantity
  }));
}

function renderCart() {
  const contents = cartContents();
  const itemCount = contents.reduce((total, item) => total + item.quantity, 0);
  const subtotal = contents.reduce((total, item) => total + item.product.price * item.quantity, 0);
  document.querySelector('#cart-count').textContent = itemCount;
  document.querySelector('#cart-title-count').textContent = itemCount ? `(${itemCount})` : '';
  document.querySelector('#subtotal').textContent = formatPrice(subtotal);
  document.querySelector('#checkout-total').textContent = formatPrice(subtotal);
  document.querySelector('#cart-empty').classList.toggle('hidden', itemCount > 0);
  document.querySelector('#cart-footer').classList.toggle('hidden', itemCount === 0);
  document.querySelector('#cart-items').innerHTML = contents.map(({ product, quantity }) => `
    <article class="cart-item">
      <img src="${escapeHtml(product.image)}" alt="" />
      <div><h3>${escapeHtml(product.name)}</h3><span class="price">${formatPrice(product.price)}</span>
        <p class="cart-vehicle-meta">${escapeHtml(product.year)} · ${escapeHtml(product.category)}</p>
        <div class="quantity-control" aria-label="Quantity for ${product.name}">
          <button type="button" data-quantity="${escapeHtml(product.id)}" data-change="-1" aria-label="Decrease quantity">−</button>
          <span>${quantity}</span>
          <button type="button" data-quantity="${escapeHtml(product.id)}" data-change="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="remove-button" type="button" data-remove="${escapeHtml(product.id)}">Remove</button>
    </article>`).join('');
}

function showOverlay() {
  overlay.classList.remove('hidden');
}

function hideAllPanels() {
  cartPanel.classList.remove('open');
  cartPanel.setAttribute('aria-hidden', 'true');
  checkoutModal.classList.add('hidden');
  successModal.classList.add('hidden');
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function openCart() {
  renderCart();
  showOverlay();
  cartPanel.classList.add('open');
  cartPanel.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function openCheckout() {
  cartPanel.classList.remove('open');
  cartPanel.setAttribute('aria-hidden', 'true');
  document.querySelector('#checkout-form').reset();
  document.querySelector('#form-error').classList.add('hidden');
  document.querySelector('#form-error').textContent = '';
  checkoutModal.classList.remove('hidden');
}

function playSuccessSound() {
  document.querySelector('#sound-error').classList.add('hidden');
  confirmationSound.currentTime = 0;
  confirmationSound.play().catch((error) => {
    const status = document.querySelector('#sound-error');
    status.textContent = 'The confirmation audio could not be played. Check that sounds/order-confirmation.mp3 is available, then try Replay success sound.';
    status.classList.remove('hidden');
    console.error('The order confirmation audio could not be played.', error);
  });
}

function placeDemoOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const error = document.querySelector('#form-error');
  const code = new FormData(form).get('demoCode').trim();
  if (code !== 'DEMO-OK') {
    error.textContent = 'That code didn’t match. Enter the demo code shown above: DEMO-OK.';
    error.classList.remove('hidden');
    form.elements.demoCode.focus();
    return;
  }
  error.classList.add('hidden');
  document.querySelector('#order-reference').textContent = `${window.STORE_CONFIG.name.slice(0, 2).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  cart.clear();
  renderCart();
  checkoutModal.classList.add('hidden');
  successModal.classList.remove('hidden');
  playSuccessSound();
}

document.querySelector('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  searchTerm = document.querySelector('#search-input').value.trim().toLowerCase();
  renderProducts();
});

document.querySelector('#search-input').addEventListener('input', (event) => {
  searchTerm = event.currentTarget.value.trim().toLowerCase();
  renderProducts();
});

document.querySelector('#sort-products').addEventListener('change', (event) => {
  sortMode = event.currentTarget.value;
  renderProducts();
});

document.querySelector('#category-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll('.category-chip').forEach((chip) => chip.classList.toggle('active', chip === button));
  renderProducts();
});

productGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const id = Number(button.dataset.add);
  const product = products.find((item) => item.id === id);
  if (!product || product.purchasable === false) return;
  cart.set(id, (cart.get(id) || 0) + 1);
  renderCart();
  button.textContent = '✓';
  window.setTimeout(() => { if (button.isConnected) button.textContent = '+'; }, 700);
});

document.querySelector('#cart-items').addEventListener('click', (event) => {
  const quantityButton = event.target.closest('[data-quantity]');
  if (quantityButton) {
    const id = Number(quantityButton.dataset.quantity);
    const quantity = (cart.get(id) || 0) + Number(quantityButton.dataset.change);
    if (quantity > 0) cart.set(id, quantity);
    else cart.delete(id);
    renderCart();
    return;
  }
  const removeButton = event.target.closest('[data-remove]');
  if (removeButton) {
    cart.delete(Number(removeButton.dataset.remove));
    renderCart();
  }
});

document.querySelector('#open-cart').addEventListener('click', openCart);
document.querySelector('#close-cart').addEventListener('click', hideAllPanels);
document.querySelector('#start-checkout').addEventListener('click', openCheckout);
document.querySelector('#close-checkout').addEventListener('click', hideAllPanels);
document.querySelector('#checkout-form').addEventListener('submit', placeDemoOrder);
document.querySelector('#continue-shopping').addEventListener('click', hideAllPanels);
document.querySelector('#replay-sound').addEventListener('click', playSuccessSound);
document.querySelector('#clear-search').addEventListener('click', () => {
  document.querySelector('#search-input').value = '';
  searchTerm = '';
  activeCategory = 'All';
  document.querySelectorAll('.category-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.category === 'All'));
  renderProducts();
});
overlay.addEventListener('click', hideAllPanels);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideAllPanels();
});

renderCategoryFilters();
renderProducts();
renderCart();
