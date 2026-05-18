let listaMaterialesBD = [];
let listaProveedoresBD = [];
let compraSeleccionadaId
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
        
        cuerpo.innerHTML = '<tr><td colspan="6">Cargando historial...</td></tr>';

        try {
            // 1. EL TRUCO ESTÁ EN EL SELECT: Traemos compra + detalle + material
            const { data, error } = await supabaseClient
                .from('compra')
                .select(`
                    id_compra,
                    fecha,
                    total,
                    proveedor (nombre_proveedor),
                    detalle_compra (
                        cantidad,
                        precio_unitario,
                        material ( nombre )
                    )
                    
                `)
                .order('id_compra', { ascending: true });

            if (error) throw error;
            cuerpo.innerHTML = '';

            data.forEach(c => {
                // 2. Extraemos los nombres de los materiales y los juntamos (por si compró varios)
                const nombresMateriales = c.detalle_compra?.map(d => `${d.material?.nombre} (x${d.cantidad})`).join(', ') || 'N/A';

                // 3. Pintamos la fila agregando la nueva columna
                cuerpo.innerHTML += `
                    <tr>
                        <td data-label="ID">#${c.id_compra}</td>
                        <td data-label="Fecha">${new Date(c.fecha).toLocaleDateString()}</td>
                        <td data-label="Proveedor">${c.proveedor ? c.proveedor.nombre_proveedor : 'N/A'}</td>
                        <td data-label="Materiales">${nombresMateriales}</td>
                        <td data-label="Cantidad"><strong>${c.detalle_compra ? c.detalle_compra.reduce((sum, d) => sum + d.cantidad, 0) : 0}</strong></td>
                        <td data-label="Precio Unitario"><strong>$${c.detalle_compra && c.detalle_compra[0]?.precio_unitario ? c.detalle_compra[0].precio_unitario.toFixed(2) : '0.00'}</strong></td>
                        <td data-label="Total"><strong>$${c.total.toFixed(2)}</strong></td>
                        <td data-label="Acciones">
                            <button class="btn-eliminar-compra" onclick="eliminarCompra(${c.id_compra})" style="background: red; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Eliminar</button>
                        </td>
                        
                    </tr>
                `;
            });
        } catch (err) {
            console.error(err);
            cuerpo.innerHTML = '<tr><td colspan="6">Error al cargar historial.</td></tr>';
        }
    }

    // --- LÓGICA DIRECTA PARA ELIMINAR COMPRA DESDE LA TABLA ---
window.eliminarCompra = async (idCompra) => {
    // Le pasamos el idCompra directamente desde el botón
    const confirmar = confirm("¿Estás seguro de anular esta compra? Se restarán los materiales del inventario actual.");
    
    if (confirmar) {
        try {
            // 1. RESCATE: Ver qué materiales se habían "comprado" en este folio
            const { data: detallesCompra, error: errGet } = await supabaseClient
                .from('detalle_compra')
                .select('id_material, cantidad')
                .eq('id_compra', idCompra); // Usamos el ID de la fila

            if (errGet) throw errGet;

            // 2. CORREGIR STOCK: Le restamos lo que se había sumado por error
            if (detallesCompra && detallesCompra.length > 0) {
                for (const item of detallesCompra) {
                    // Traemos el stock actual del material
                    const { data: matActual } = await supabaseClient
                        .from('material')
                        .select('stock')
                        .eq('id_material', item.id_material)
                        .single();

                    if (matActual) {
                        // MAGIA INVERSA: Restamos la cantidad
                        const stockCorregido = matActual.stock - item.cantidad;

                        // Actualizamos en la BD
                        await supabaseClient
                            .from('material')
                            .update({ stock: stockCorregido })
                            .eq('id_material', item.id_material);
                    }
                }
            }

            // 3. BORRAR LA COMPRA (Supabase borra los detalles si tienes CASCADE)
            const { error: errDelete } = await supabaseClient
                .from('compra') 
                .delete()
                .eq('id_compra', idCompra);

            if (errDelete) throw errDelete;

            alert("¡Compra anulada y stock corregido con éxito!");
            location.reload(); 
            
        } catch (err) {
            alert("Error al anular compra: " + err.message);
            console.error(err);
        }
    }
};

    // === 4. MANEJO DEL MODAL ===
    const modal = document.getElementById('modal-compra');
    document.getElementById('btn-nueva-compra').onclick = () => modal.showModal();
    document.getElementById('btn-cancelar-compra').onclick = () => modal.close();

    // === 5. REGISTRAR COMPRA (LÓGICA MAESTRO-DETALLE + SUMA STOCK) ===
    const form = document.getElementById('form-compra');
    if (form) {
        form.onsubmit = async (e) => {
        e.preventDefault();
        const textoProveedor = document.getElementById('proveedor-nombre').value;
        const textoMaterial = document.getElementById('material-nombre').value;
        const precioUnitario = parseFloat(document.getElementById('compra-precio-unitario').value);
        const cantidad = parseInt(document.getElementById('compra-cantidad').value);
        const total = parseFloat(document.getElementById('total-compra').value);

    // 2. Buscamos en nuestras variables globales para sacar el ID real
        const provEncontrado = listaProveedoresBD.find(p => p.nombre_proveedor === textoProveedor);
        const matEncontrado = listaMaterialesBD.find(m => m.nombre === textoMaterial);

    // Extraemos el ID o lo dejamos en null si Mauricio escribió algo que no existe
        const idProvReal = provEncontrado ? provEncontrado.id_proveedor : null;
        const idMatReal = matEncontrado ? matEncontrado.id_material : null;

    // 3. Validamos antes de intentar guardar
        if (!idProvReal || !idMatReal) {
        return alert("Por favor selecciona un proveedor y material válidos de la lista.");
        }
        const fechaActual = new Date().toISOString();
        // 1. Recuperamos el ID primero (asegúrate que la clave sea la correcta)
        const idUsuarioActual = localStorage.getItem('rolUsuario'); 

        try {
            // 2. Iniciamos la cadena de Supabase SIN interrupciones
            const { data: nuevaCompra, error: errC } = await supabaseClient
                .from('compra')
                .insert([{ 
                    id_proveedor: idProvReal, 
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
                        id_material: idMatReal,
                        cantidad: cantidad,
                        precio_unitario: precioUnitario
                    }]);

                if (errD) throw errD;

                // C. MAGIA: ACTUALIZAR STOCK
                const { data: materialActual } = await supabaseClient
                    .from('material')
                    .select('stock')
                    .eq('id_material', idMatReal)
                    .single();

                const nuevoStock = materialActual.stock + cantidad;

                const { error: errStock } = await supabaseClient
                    .from('material')
                    .update({ stock: nuevoStock, costo_unitario: precioUnitario }) 
                    .eq('id_material', idMatReal);

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
    const inputBuscador = document.querySelector('.barra-busqueda input'); 

    if (inputBuscador) {
        inputBuscador.addEventListener('keyup', (e) => {
            const textoBusqueda = e.target.value.toLowerCase();
        
            const filas = document.querySelectorAll('#tabla-body-compras tr');

            filas.forEach(fila => {
            // Convertimos todo el contenido de la fila a minúsculas
            const contenidoFila = fila.textContent.toLowerCase();
            
            // Si la fila contiene lo que se escribió, la mostramos; si no, la ocultamos
            if (contenidoFila.includes(textoBusqueda)) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    });
}
async function cargarMaterialesDatalist() {
    try {
        const { data, error } = await supabaseClient
            .from('material')
            .select('id_material, nombre');
            
        if (error) throw error;
        
        listaMaterialesBD = data; 
        const datalist = document.getElementById('lista-materiales');
        
        if (datalist) {
            datalist.innerHTML = '';
            data.forEach(m => {
                datalist.innerHTML += `<option value="${m.nombre}"></option>`;
            });
        }
    } catch (err) {
        console.error("Error al cargar materiales para autocompletar:", err);
    }
    }
    async function cargarProveedoresDatalist() {
    try {
        const { data, error } = await supabaseClient
            .from('proveedor')
            .select('id_proveedor, nombre_proveedor');
            
        if (error) throw error;
        
        listaProveedoresBD = data; 
        const datalist = document.getElementById('lista-proveedores');
        
        if (datalist) {
            datalist.innerHTML = '';
            data.forEach(p => {
                
                datalist.innerHTML += `<option value="${p.nombre_proveedor}"></option>`;
            });
        }
    } catch (err) {
        console.error("Error al cargar proveedores para autocompletar:", err);
    }
    }
    // --- LÓGICA PARA ELIMINAR COMPRA Y AJUSTAR STOCK ---
    const btnEliminarCompra = document.getElementById('btn-eliminar-compra');
    
    if (btnEliminarCompra) {
        btnEliminarCompra.onclick = async () => {
            if (!compraSeleccionadaId) return;

            const confirmar = confirm("¿Estás seguro de anular esta compra? Se restarán los materiales del inventario actual.");
            
            if (confirmar) {
                try {
                    // 1. RESCATE: Ver qué materiales se habían "comprado"
                    const { data: detallesCompra, error: errGet } = await supabaseClient
                        .from('detalle_compra')
                        .select('id_material, cantidad')
                        .eq('id_compra', compraSeleccionadaId);

                    if (errGet) throw errGet;

                    // 2. CORREGIR STOCK: Le restamos lo que se había sumado por error
                    if (detallesCompra && detallesCompra.length > 0) {
                        for (const item of detallesCompra) {
                            // Traemos el stock actual
                            const { data: matActual } = await supabaseClient
                                .from('material')
                                .select('stock')
                                .eq('id_material', item.id_material)
                                .single();

                            if (matActual) {
                                // MAGIA INVERSA: Restamos la cantidad
                                const stockCorregido = matActual.stock - item.cantidad;

                                // Actualizamos en la BD
                                await supabaseClient
                                    .from('material')
                                    .update({ stock: stockCorregido })
                                    .eq('id_material', item.id_material);
                            }
                        }
                    }

                    // 3. BORRAR LA COMPRA
                    
                    const { error: errDelete } = await supabaseClient
                        .from('compra') 
                        .delete()
                        .eq('id_compra', compraSeleccionadaId);

                    if (errDelete) throw errDelete;

                    alert("¡Compra anulada y stock corregido con éxito!");
                    location.reload(); 
                    
                } catch (err) {
                    alert("Error al anular compra: " + err.message);
                    console.error(err);
                }
            }
        };
    }
        


    // INICIO
    iniciarEncabezado();
    cargarHistorial();
    cargarMaterialesDatalist();
    cargarProveedoresDatalist();
});

