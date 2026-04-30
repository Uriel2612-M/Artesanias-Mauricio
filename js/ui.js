// js/ui.js - Manejo de interfaz global
document.addEventListener('DOMContentLoaded', () => {
    // 1. Lógica del Menú Lateral
    const btnMenu = document.getElementById('btn-menu-movil');
    const nav = document.querySelector('nav');

    if (btnMenu && nav) {
        btnMenu.onclick = () => {
            nav.classList.toggle('abierto');
        };

        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !btnMenu.contains(e.target) && nav.classList.contains('abierto')) {
                nav.classList.remove('abierto');
            }
        });
    }

    // 2. Ajuste automático de Tablas en Celular
    const tablas = document.querySelectorAll('table');
    tablas.forEach(tabla => {
        if (!tabla.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            tabla.parentNode.insertBefore(wrapper, tabla);
            wrapper.appendChild(tabla);
        }
    });
});