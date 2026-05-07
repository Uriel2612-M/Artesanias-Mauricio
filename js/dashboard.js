document.addEventListener('DOMContentLoaded', () => {
    
    // 1. RELOJ Y USUARIO
    function iniciarEncabezado() {
        const nombre = localStorage.getItem('nombreUsuario') || 'Desconocido';
        const idRol = localStorage.getItem('rolUsuario');
        const textoRol = idRol === '1' ? 'ADMIN' : 'USUARIO';
        
        document.getElementById('header-usuario').textContent = `${nombre.toUpperCase()} (${textoRol})`;

        setInterval(() => {
            const ahora = new Date();
            document.getElementById('header-fecha').textContent = ahora.toLocaleDateString('es-MX');
            document.getElementById('header-hora').textContent = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        }, 1000);
    }

    // 2. CÁLCULOS 
    async function cargarEstadisticas() {
        try {
            // Fecha Local México
            const ahoraLocal = new Date();
            const hoy = ahoraLocal.getFullYear() + "-" + 
                        String(ahoraLocal.getMonth() + 1).padStart(2, '0') + "-" + 
                        String(ahoraLocal.getDate()).padStart(2, '0');

            // A. Ventas
            const { data: ventaHoy, error: errVentas } = await supabaseClient
                .from('venta')
                .select('*')
                .eq('fecha', hoy);

            if (!errVentas && ventaHoy) {
                document.getElementById('dash-ventas').textContent = ventaHoy.length;
            }

            // B. Productos
            const { data: productos, error: errProd } = await supabaseClient
                .from('producto')
                .select('nombre, stock');

            if (!errProd && productos) {
                const totalStock = productos.reduce((suma, item) => suma + (Number(item.stock) || 0), 0);
                document.getElementById('dash-stock').textContent = totalStock;

                const artesaniasBajas = productos.filter(p => p.stock < 5).map(p => p.nombre);
                document.getElementById('dash-baja-art').textContent = artesaniasBajas.length > 0 ? artesaniasBajas.join(', ') : 'Ninguno';
            }

            // C. Materiales
            const { data: materiales, error: errMat } = await supabaseClient
                .from('material')
                .select('nombre, stock')
                .lt('stock', 5);

            if (!errMat && materiales) {
                const nombresMateriales = materiales.map(m => m.nombre);
                document.getElementById('dash-baja-mat').textContent = nombresMateriales.length > 0 ? nombresMateriales.join(', ') : 'Ninguno';
            }

        } catch (error) {
            console.error("Error en dashboard:", error);
        }
    }

    iniciarEncabezado();
    cargarEstadisticas();
});