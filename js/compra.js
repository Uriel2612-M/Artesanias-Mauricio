document.addEventListener('DOMContentLoaded', () => {
    // === 1. INICIALIZACIÓN Y ENCABEZADO ===
    function iniciarEncabezado() {
        const nombre = localStorage.getItem('nombreUsuario') || 'Desconocido';
        const idRol = localStorage.getItem('rolUsuario');
        const textoRol = idRol === '1' ? 'ADMIN' : 'USUARIO';
        
        const elUsuario = document.getElementById('header-usuario');
        if(elUsuario) elUsuario.textContent = `${nombre.toUpperCase()} (${textoRol})`;

        setInterval(() => {
            const elFecha = document.getElementById('header-fecha');
            const elHora = document.getElementById('header-hora');
            const ahora = new Date();
            if(elFecha) elFecha.textContent = ahora.toLocaleDateString('es-MX');
            if(elHora) elHora.textContent = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        }, 1000);
    }

    // === 2. CARGAR HISTORIAL DE COMPRAS (MAESTRO) ===
    async function cargarHistorial() {
        const cuerpo = document.getElementById('tabla-body-compras');
        if (!cuerpo) return;
        
        cuerpo.innerHTML = '<tr><td colspan="5">Cargando historial...</td></tr>';

        try {
            // Hacemos un join simple trayendo el nombre del proveedor
            const { data, error } = await supabaseClient
                .from('compra')
                .select(`
                    id_compra,
                    fecha,
                    total,
                    proveedor (nombre_proveedor)
                `)
                .order('fecha', { ascending: false });

            if (error) throw error;
            cuerpo.innerHTML = '';

            data.forEach(c => {
                cuerpo.innerHTML += `
                    <tr>
                        <td>#${c.id_compra}</td>
                        <td>${new Date(c.fecha).toLocaleDateString()}</td>
                        <td>${c.proveedor ? c.proveedor.nombre_proveedor : 'N/A'}</td>
                        <td><strong>$${c.total.toFixed(2)}</strong></td>
                      
                    </tr>
                `;
            });
        } catch (err) {
            console.error(err);
            cuerpo.innerHTML = '<tr><td colspan="5">Error al cargar historial.</td></tr>';
        }
    }

    // === 3. POBLAR SELECTS (PROVEEDORES Y MATERIALES) ===
    async function cargarSelects() {
        try {
            // Cargar Proveedores
            const { data: provs } = await supabaseClient.from('proveedor').select('id_proveedor, nombre_proveedor');
            const selProv = document.getElementById('compra-proveedor');
            if (selProv) {
                provs.forEach(p => selProv.innerHTML += `<option value="${p.id_proveedor}">${p.nombre_proveedor}</option>`);
            }

            // Cargar Materiales
            const { data: mats } = await supabaseClient.from('material').select('id_material, nombre, stock');
            const selMat = document.getElementById('compra-material');
            if (selMat) {
                selMat.innerHTML = '<option value="">-- Selecciona material --</option>';
                mats.forEach(m => selMat.innerHTML += `<option value="${m.id_material}">${m.nombre} (Stock actual: ${m.stock})</option>`);
            }
        } catch (err) {
            console.error("Error al cargar selects:", err);
        }
    }

    // === 4. MANEJO DEL MODAL ===
    const modal = document.getElementById('modal-compra');
    document.getElementById('btn-nueva-compra').onclick = () => modal.showModal();
    document.getElementById('btn-cancelar-compra').onclick = () => modal.close();

    // === 5. REGISTRAR COMPRA (LÓGICA MAESTRO-DETALLE + SUMA STOCK) ===
    const form = document.getElementById('form-compra');
    if (form) {
        form.onsubmit = async (e) => {
        e.preventDefault();
        
        const idProv = document.getElementById('compra-proveedor').value;
        const idMat = document.getElementById('compra-material').value;
        const cantidad = parseInt(document.getElementById('compra-cantidad').value);
        const total = parseFloat(document.getElementById('total-compra').value);
        const fechaActual = new Date().toISOString();

        // --- EL ARREGLO ESTÁ AQUÍ, APA ---
        // 1. Recuperamos el ID primero (asegúrate que la clave sea la correcta)
        const idUsuarioActual = localStorage.getItem('rolUsuario'); 

        try {
            // 2. Iniciamos la cadena de Supabase SIN interrupciones
            const { data: nuevaCompra, error: errC } = await supabaseClient
                .from('compra')
                .insert([{ 
                    id_proveedor: idProv, 
                    id_usuario: idUsuarioActual, 
                    total: total, 
                    fecha: fechaActual 
                }])
                .select()
                .single();

            if (errC) throw errC;

                // B. CREAR DETALLE
                const { error: errD } = await supabaseClient
                    .from('detalle_compra')
                    .insert([{
                        id_compra: nuevaCompra.id_compra,
                        id_material: idMat,
                        cantidad: cantidad,
                        precio_unitario: (total / cantidad) 
                    }]);

                if (errD) throw errD;

                // C. MAGIA: ACTUALIZAR STOCK (SUMAR)
                // Primero traemos el stock actual para no regarla
                const { data: materialActual } = await supabaseClient
                    .from('material')
                    .select('stock')
                    .eq('id_material', idMat)
                    .single();

                const nuevoStock = materialActual.stock + cantidad;

                const { error: errStock } = await supabaseClient
                    .from('material')
                    .update({ stock: nuevoStock })
                    .eq('id_material', idMat);

                if (errStock) throw errStock;

                alert("¡Compra registrada y stock actualizado!");
                modal.close();
                form.reset();
                cargarHistorial();
                    
            } catch (err) {
                alert("Error: " + err.message);
                console.error(err);
            }
            
        };
    }

    // INICIO
    iniciarEncabezado();
    cargarHistorial();
    cargarSelects();
});

