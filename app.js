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
        li.setAttribute('draggable', 'true');
        li.innerHTML = `
            <span class="producto-nombre">${prod.nombre}</span>
            <button class="eliminar-producto" title="Eliminar producto" data-idx="${idx}">Eliminar</button>
            <span class="producto-precio">€${prod.precio.toFixed(2)}</span>
        `;
        // Drag events
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);
        listaProductos.appendChild(li);
    });
}

// Drag and drop handlers
let draggedIdx = null;

function handleDragStart(e) {
    draggedIdx = +this.getAttribute('data-idx');
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('dragover');
    const targetIdx = +this.getAttribute('data-idx');
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    // Reorder productos array
    const moved = productos.splice(draggedIdx, 1)[0];
    productos.splice(targetIdx, 0, moved);
    renderProductos();
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = document.querySelectorAll('.producto-item');
    items.forEach(item => item.classList.remove('dragover'));
    draggedIdx = null;
}


// --- Firestore helpers ---
async function getAllProductos() {
    const snapshot = await db.collection('productos').get();
    // Si hay productos con 'orden', ordénalos; si no, muéstralos igual
    let docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    if (docs.some(p => typeof p.orden === 'number')) {
        docs = docs.sort((a, b) => {
            if (typeof a.orden === 'number' && typeof b.orden === 'number') return a.orden - b.orden;
            if (typeof a.orden === 'number') return -1;
            if (typeof b.orden === 'number') return 1;
            return 0;
        });
    }
    return docs;
}

async function addProducto(nombre, precio) {
    await db.collection('productos').add({ nombre, precio });
}

async function eliminarProductoDB(id) {
    await db.collection('productos').doc(id).delete();
}

function renderCarrito() {
    carritoUl.innerHTML = '';
    carrito.forEach((item, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.nombre} - €${item.precio.toFixed(2)} <button data-idx="${idx}">Treure</button>`;
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
    // Eliminar producto si se hace click en el botón
    if (e.target.classList.contains('eliminar-producto')) {
        const idx = e.target.getAttribute('data-idx');
        const producto = productos[idx];
        if (producto && producto.id) {
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
    // Actualización en tiempo real (opcional)
    db.collection('productos').onSnapshot(() => cargarProductos());
});
