// Lógica principal para el punto de venta de flores

let productos = [];
let carrito = [];

const formProducto = document.getElementById('form-producto');
const nombreProducto = document.getElementById('nombre-producto');
const precioProducto = document.getElementById('precio-producto');
const listaProductos = document.getElementById('lista-productos');
const carritoUl = document.getElementById('carrito');
const totalSpan = document.getElementById('total');
const formPago = document.getElementById('form-pago');
const pagoInput = document.getElementById('pago');
const cambioDiv = document.getElementById('cambio');
const nuevaVentaBtn = document.getElementById('nueva-venta');

function renderProductos() {
    listaProductos.innerHTML = '';
    productos.forEach((prod, idx) => {
        const li = document.createElement('li');
        li.className = 'producto-item';
        li.setAttribute('data-idx', idx);
            li.innerHTML = `
                <span class="producto-nombre">${prod.nombre}</span>
                <button class="eliminar-producto" title="Eliminar producto" data-idx="${idx}">Eliminar</button>
                <span class="producto-precio">€${prod.precio.toFixed(2)}</span>
            `;
        listaProductos.appendChild(li);
    });
}

// --- IndexedDB helpers ---
function openDB() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open('FloresDB', 1);
        request.onupgradeneeded = function(e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('productos')) {
                db.createObjectStore('productos', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = function(e) { resolve(e.target.result); };
        request.onerror = function(e) { reject(e); };
    });
}

async function getAllProductos() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('productos', 'readonly');
        const store = tx.objectStore('productos');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function addProducto(nombre, precio) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('productos', 'readwrite');
        const store = tx.objectStore('productos');
        const req = store.add({ nombre, precio });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function renderCarrito() {
    carritoUl.innerHTML = '';
    carrito.forEach((item, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.nombre} - €${item.precio.toFixed(2)} <button data-idx="${idx}">Quitar</button>`;
        carritoUl.appendChild(li);
    });
    totalSpan.textContent = carrito.reduce((acc, item) => acc + item.precio, 0).toFixed(2);
}

formProducto.addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = nombreProducto.value.trim();
    const precio = parseFloat(precioProducto.value);
    if (nombre && !isNaN(precio) && precio >= 0) {
        await addProducto(nombre, precio);
        await cargarProductos();
        formProducto.reset();
    }
});

listaProductos.addEventListener('click', async e => {
    // Eliminar producto si se hace click en la X
    if (e.target.classList.contains('eliminar-producto')) {
        const idx = e.target.getAttribute('data-idx');
        const producto = productos[idx];
        if (producto && producto.id !== undefined) {
            await eliminarProductoDB(producto.id);
            await cargarProductos();
        }
        return;
    }
    // Añadir al carrito si se hace click en el cuadrado
    let li = e.target;
    while (li && !li.classList.contains('producto-item')) {
        li = li.parentElement;
    }
    if (li && li.classList.contains('producto-item')) {
        const idx = li.getAttribute('data-idx');
        if (productos && productos[idx]) {
            carrito.push({ ...productos[idx] });
            renderCarrito();
        }
    }
});

// Eliminar producto de la base de datos
async function eliminarProductoDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('productos', 'readwrite');
        const store = tx.objectStore('productos');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

carritoUl.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') {
        const idx = e.target.getAttribute('data-idx');
        carrito.splice(idx, 1);
        renderCarrito();
    }
});

formPago.addEventListener('submit', e => {
    e.preventDefault();
    const total = carrito.reduce((acc, item) => acc + item.precio, 0);
    const pago = parseFloat(pagoInput.value);
    if (!isNaN(pago) && pago >= total) {
        const cambio = pago - total;
        cambioDiv.textContent = `Cambio: €${cambio.toFixed(2)}`;
    } else {
        cambioDiv.textContent = 'Dinero insuficiente.';
    }
});

nuevaVentaBtn.addEventListener('click', () => {
    carrito = [];
    renderCarrito();
    cambioDiv.textContent = '';
    formPago.reset();
});


// Inicializar
async function cargarProductos() {
    productos = await getAllProductos();
    renderProductos();
}

window.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    renderCarrito();
});
