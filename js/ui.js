const btnAbrirModal = document.getElementById('btn-nueva-venta');
const modalVenta = document.getElementById('modal-nueva-venta');
const btnCerrarModal = document.getElementById('btn-cancelar');

if (btnAbrirModal) {
    btnAbrirModal.addEventListener('click', () => {
        modalVenta.showModal(); 
    });
}

if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', () => {
        modalVenta.close(); 
    });
}


const inputBusqueda = document.querySelector('.barra-busqueda input');
const tablaDatos = document.querySelector('table tbody');

if (inputBusqueda && tablaDatos) {
    inputBusqueda.addEventListener('keyup', () => {
        const texto = inputBusqueda.value.toLowerCase();
        const filas = tablaDatos.querySelectorAll('tr');

        filas.forEach(fila => {

            const contenidoFila = fila.textContent.toLowerCase();
            if (contenidoFila.includes(texto)) {
                fila.style.display = ''; 
            } else {
                fila.style.display = 'none'; 
            }
        });
    });
}

/* ==========================================
   LÓGICA DEL MODAL DE ARTESANÍAS
   ========================================== */

const btnNuevaArtesania = document.getElementById('btn-nueva-artesania');
const modalArtesania = document.getElementById('modal-nueva-artesania');
const btnCerrarArtesania = document.getElementById('btn-cancelar-artesania');

if (btnNuevaArtesania && modalArtesania) {
    btnNuevaArtesania.addEventListener('click', () => {
        modalArtesania.showModal();
    });
}

if (btnCerrarArtesania && modalArtesania) {
    btnCerrarArtesania.addEventListener('click', () => {
        modalArtesania.close();
    });
}
const btnNuevoMaterial = document.getElementById('btn-nuevo-material');
const modalMaterial = document.getElementById('modal-nuevo-material');
const btnCerrarMaterial = document.getElementById('btn-cancelar-material');

if (btnNuevoMaterial && modalMaterial) {
    btnNuevoMaterial.addEventListener('click', () => {
        modalMaterial.showModal();
    });
}

if (btnCerrarMaterial && modalMaterial) {
    btnCerrarMaterial.addEventListener('click', () => {
        modalMaterial.close();
    });
}


/* ==========================================
   LÓGICA DE LOS BOTONES "EDITAR" EN LAS TABLAS
   ========================================== */

const botonesEditar = document.querySelectorAll('.btn-editar');

botonesEditar.forEach(boton => {
    boton.addEventListener('click', () => {
        
        if (modalArtesania) {
            modalArtesania.showModal();
        } else if (modalVenta) {
            modalVenta.showModal();
        }
    });
});

/* ==========================================
   LÓGICA DEL MENÚ PARA CELULARES
   ========================================== */
const btnMenuMovil = document.getElementById('btn-menu-movil');
const navMenu = document.querySelector('nav');

if (btnMenuMovil && navMenu) {
    btnMenuMovil.addEventListener('click', () => {
        navMenu.classList.toggle('abierto');
    });
}

/* ==========================================
   4. LÓGICA DE COMPRAS (SURTIR)
   ========================================== */
const btnNuevaCompra = document.getElementById('btn-nueva-compra');
const modalCompra = document.getElementById('modal-compra');
const btnCerrarCompra = document.getElementById('btn-cancelar-compra');

if (btnNuevaCompra && modalCompra) {
    btnNuevaCompra.addEventListener('click', () => modalCompra.showModal());
}
if (btnCerrarCompra && modalCompra) {
    btnCerrarCompra.addEventListener('click', () => modalCompra.close());
}

// js/ui.js
document.addEventListener('DOMContentLoaded', () => {
    const rolActual = localStorage.getItem('rolUsuario');
    console.log("El ID del rol que entró es el:", rolActual);
    
    // Si NO es el admin (1), ocultamos
    if (rolActual !== '1') { 
        const elementosProhibidos = document.querySelectorAll('.solo-admin');
        elementosProhibidos.forEach(elemento => {
            elemento.style.display = 'none';
        });
    }
});