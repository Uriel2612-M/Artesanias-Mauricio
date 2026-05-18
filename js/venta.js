document.addEventListener('DOMContentLoaded', () => {
    let carrito = [];
    let totalVenta = 0;
    let ventaSeleccionadaId = null;
    let listaProductosBD = [];

    // --- 1. ENCABEZADO ---
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

    // --- 2. MANEJO DEL MODAL ---
    const modal = document.getElementById('modal-venta');
    const btnNuevaVenta = document.getElementById('btn-nueva-venta');
    
    if(btnNuevaVenta) btnNuevaVenta.onclick = () => modal.showModal();
    
    document.getElementById('btn-cancelar-venta').onclick = () => {
    document.getElementById('form-venta').reset(); 
    carrito = [];
    renderizarCarrito();
    modal.close();
};

    // --- 3. CARRITO TEMPORAL ---
    document.getElementById('btn-agregar-item').onclick = () => {
        const nombreArt = document.getElementById('v-artesania-nombre').value;
        const cant = parseInt(document.getElementById('v-cantidad').value);
        const precioManual = parseFloat(document.getElementById('v-precio-unitario').value);
        const prodBD = listaProductosBD.find(p => p.nombre === nombreArt);
        const idReal = prodBD ? prodBD.id_producto : null;

        if(nombreArt && cant > 0 && precioManual > 0) {
            carrito.push({ 
                id_producto: idReal,
                nombre: nombreArt, 
                cant, 
                precio: precioManual, 
                subtotal: cant * precioManual 
            });
            
            document.getElementById('v-artesania-nombre').value = '';
            document.getElementById('v-cantidad').value = '1';
            
            // MODIFICADO: Al limpiar el input de precio, le regresamos la edición libre temporalmente
            const inputPrecio = document.getElementById('v-precio-unitario');
            inputPrecio.value = '';
            inputPrecio.readOnly = false; 
            
            renderizarCarrito();
        } else {
            alert("Coloca nombre, cantidad y precio válido.");
        }
    };

    function renderizarCarrito() {
        const cuerpo = document.getElementById('cuerpo-carrito');
        if (!cuerpo) return; 
        
        cuerpo.innerHTML = '';
        totalVenta = 0;
        
        carrito.forEach((item, index) => {
            totalVenta += item.subtotal;
            cuerpo.innerHTML += `
                <tr>
                    <td>${item.nombre}</td>
                    <td>${item.cant}</td>
                    <td>$${item.subtotal}</td>
                    <td><button type="button" onclick="quitarItem(${index})">x</button></td>
                </tr>`;
        });
        
        const elTotalLabel = document.getElementById('total-pre-venta');
        if (elTotalLabel) elTotalLabel.textContent = totalVenta;
        
        const elTotalInput = document.getElementById('v-total-calculado');
        if (elTotalInput) {
            elTotalInput.value = totalVenta;
            elTotalInput.dispatchEvent(new Event('input')); 
        }
    }
    
    window.quitarItem = (index) => {
        carrito.splice(index, 1);
        renderizarCarrito();
    };

    // --- 4. FINALIZAR COMPRA ---
    document.getElementById('form-venta').onsubmit = async (e) => {
        e.preventDefault();
        if (carrito.length === 0) return alert("Agrega artesanías al carrito primero.");

        const btnGuardar = document.getElementById('btn-finalizar');
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        try {
            // 1. Insertar Cliente 
            // MODIFICADO: Ahora jala de forma separada v-apellido-paterno y v-apellido-materno
            const { data: nuevoCliente, error: errCliente } = await supabaseClient
                .from('cliente')
                .insert([{
                    nombre: document.getElementById('v-nombre').value,
                    apellido_pat: document.getElementById('v-apellido-paterno').value,
                    apellido_mat: document.getElementById('v-apellido-materno').value
                }])
                .select().single();

            if (errCliente) throw errCliente;

            // 2. Insertar Venta
            const { data: nuevaVenta, error: errVenta } = await supabaseClient
                .from('venta')
                .insert([{
                    id_cliente: nuevoCliente.id_cliente,
                    total_venta: totalVenta, 
                    monto_pagado: parseFloat(document.getElementById('v-abono').value) || 0, 
                    fecha: document.getElementById('v-fecha-entrega').value || new Date().toISOString().split('T')[0],
                    estado_pago: document.getElementById('v-estado-pago').value,
                    fecha_limite: document.getElementById('v-fecha-limite').value || null
                }])
                .select().single();

            if (errVenta) throw errVenta;

            // 3. Insertar Detalles
            const detalles = carrito.map(item => ({
                id_venta: nuevaVenta.id_venta,
                id_producto: item.id_producto, 
                cantidad: item.cant,
                precio_unitario: item.precio
            }));

            const { error: errDetalle } = await supabaseClient
                .from('detalle_venta').insert(detalles);

            if (errDetalle) throw errDetalle;

            alert("¡Venta registrada con éxito!");
            location.reload();

        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Registrar nueva compra';
        }
    };

    // --- 5. CARGAR HISTORIAL ---
    async function cargarVentas() {
        try {
            const { data, error } = await supabaseClient
                .from('venta')
                .select(`
                    id_venta,
                    fecha,
                    total_venta,
                    monto_pagado,
                    estado_pago,
                    fecha_limite,
                    cliente ( id_cliente, nombre, apellido_pat, apellido_mat),
                    detalle_venta ( cantidad, producto ( nombre ) )
                `);

            if (error) throw error;

            const cuerpoV = document.getElementById('cuerpo-ventas');
            cuerpoV.innerHTML = '';

            if (data) {
                data.sort((a, b) => {
                    // 1. Le asignamos una "prioridad" (1 es más urgente que 2)
                    const prioridadA = (a.estado_pago === 'Debe' || a.estado_pago === 'Anticipo') ? 1 : 2;
                    const prioridadB = (b.estado_pago === 'Debe' || b.estado_pago === 'Anticipo') ? 1 : 2;

                    // 2. Si A es más urgente que B, lo empuja para arriba
                    if (prioridadA < prioridadB) return -1;
                    if (prioridadA > prioridadB) return 1;

                    // 3. Si tienen la misma prioridad (los dos deben o los dos ya pagaron),
                    // los ordenamos por ID de mayor a menor (los más nuevos hasta arriba)
                    return b.id_venta - a.id_venta;
                });
                data.forEach(v => {
                    const nom = v.cliente ? v.cliente.nombre : 'Público';
                    const ape = v.cliente ? v.cliente.apellido_pat : 'General';
                    const apeMat = v.cliente ? v.cliente.apellido_mat : 'N/A';

                    const nombresArt = v.detalle_venta?.map(d => `${d.producto?.nombre} (x${d.cantidad})`).join(', ') || 'Sin productos';
                    
                    const totalReal = v.total_venta || v.monto_pagado || 0;
                    const abono = v.monto_pagado || 0;
                    const saldo = totalReal - abono;
                    
                    const ventaJSON = JSON.stringify(v).replace(/"/g, '&quot;');
                    let fechaFormateada = 'Sin fecha';
                    if (v.fecha) {
                        fechaFormateada = new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                    
                    let diseñoEstado = `<strong>${v.estado_pago}</strong>`;
                
                    // Si debe o es anticipo, Y además hay una fecha límite guardada
                    if ((v.estado_pago === 'Debe' || v.estado_pago === 'Anticipo') && v.fecha_limite) {
                    // Formateamos la fecha límite para que se lea chido
                        const fechaLim = new Date(v.fecha_limite + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
                    
                    // Le agregamos el letrerito rojo abajo del estado
                        diseñoEstado += `<br><small style="color: #d9534f; font-size: 0.8em;">Límite: ${fechaLim}</small>`;
                    }
                    cuerpoV.innerHTML += `
                        <tr>
                            <td data-label="ID/Fecha">
                                <strong>${v.id_venta}</strong><br>
                                <small style="color: #888; font-size: 0.8em;">${fechaFormateada}</small>
                            </td>
                            <td data-label="Cliente">${nom}</td>              
                            <td data-label="Apellido Paterno">${ape}</td>                    
                            <td data-label="Apellido Materno">${apeMat}</td>        
                            <td data-label="Productos">${nombresArt}</td>        
                            <td data-label="Total">$${totalReal}</td>        
                            <td data-label="Abono">$${abono}</td>            
                            <td data-label="Saldo" style="color: ${saldo > 0 ? 'red' : '#a8e42f'}">$${saldo.toFixed(2)}</td> 
                            <td data-label="Estado">${diseñoEstado}</td>
                            <td data-label="Acciones" class="solo-admin"> <button class="btn-editar" onclick="abrirEditorVenta('${ventaJSON}')">Editar</button>
                            </td>
                        </tr>`;
                });
            }
        } catch (err) {
            console.error("Error:", err);
        }
    }

    // --- 6. EDICIÓN ---
    window.abrirEditorVenta = (datosStr) => {
        try {
            const v = JSON.parse(datosStr);
            ventaSeleccionadaId = v.id_venta;
            const modalEdit = document.getElementById('modal-editar-venta');
            
            document.getElementById('edit-id-venta').value = v.id_venta;
            document.getElementById('edit-id-cliente').value = v.cliente?.id_cliente || v.id_cliente;

            document.getElementById('edit-nombre').value = v.cliente?.nombre || '';
            document.getElementById('edit-apellidos').value = v.cliente?.apellido_pat || '';
            document.getElementById('edit-apellido-materno').value = v.cliente?.apellido_mat || '';

            document.getElementById('edit-total-venta').value = v.total_venta || v.monto_pagado || 0;
            document.getElementById('edit-monto-pagado').value = v.monto_pagado || 0;
            document.getElementById('edit-estado-pago').value = v.estado_pago || 'Pagado';

            modalEdit.showModal();
        } catch (err) {
            console.error("Error al abrir:", err);
        }
    };

    document.getElementById('btn-cerrar-edit').onclick = () => document.getElementById('modal-editar-venta').close();

    // --- 7. LÓGICA DE CÁLCULO DE SALDO EN VIVO ---
    const inputAbono = document.getElementById('v-abono');
    if (inputAbono) {
        inputAbono.addEventListener('input', () => {
            const total = parseFloat(document.getElementById('v-total-calculado').value) || 0;
            const abono = parseFloat(inputAbono.value) || 0;
            const restante = total - abono;
            const elSaldo = document.getElementById('v-saldo-restante');
            if (elSaldo) elSaldo.value = restante.toFixed(2);
        });
    }

    // === LÓGICA DEL BUSCADOR DE VENTAS ===
    const inputBuscador = document.querySelector('.barra-busqueda input'); 
    if (inputBuscador) {
        inputBuscador.addEventListener('keyup', (e) => {
            const textoBusqueda = e.target.value.toLowerCase();
            const filas = document.querySelectorAll('#cuerpo-ventas tr');

            filas.forEach(fila => {
                const contenidoFila = fila.textContent.toLowerCase();
                if (contenidoFila.includes(textoBusqueda)) {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        });
    }

    iniciarEncabezado();
    cargarVentas();
    cargarProductosDatalist();

    document.getElementById('form-editar-venta').onsubmit = async (e) => {
        e.preventDefault();
        
        const idV = document.getElementById('edit-id-venta').value;
        const idC = document.getElementById('edit-id-cliente').value;
        
        const nuevoAbono = parseFloat(document.getElementById('edit-monto-pagado').value);
        const nuevoEstado = document.getElementById('edit-estado-pago').value;

        try {
            await supabaseClient.from('cliente').update({
                nombre: document.getElementById('edit-nombre').value,
                apellido_pat: document.getElementById('edit-apellidos').value,
                apellido_mat: document.getElementById('edit-apellido-materno').value
            }).eq('id_cliente', idC);

            const { error } = await supabaseClient.from('venta').update({
                monto_pagado: nuevoAbono,
                estado_pago: nuevoEstado
            }).eq('id_venta', idV);

            if (error) throw error;

            alert("¡Venta actualizada! El saldo se recalculó con éxito.");
            location.reload();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const btnEliminarVenta = document.getElementById('btn-eliminar-venta');
    if (btnEliminarVenta) {
        btnEliminarVenta.onclick = async () => {
            if (!ventaSeleccionadaId) return;

            const confirmar = confirm("¿Estás seguro de eliminar esta venta? Las artesanías regresarán al inventario.");
            if (confirmar) {
                try {
                    const { data: detallesVenta, error: errGet } = await supabaseClient
                        .from('detalle_venta')
                        .select('id_producto, cantidad')
                        .eq('id_venta', ventaSeleccionadaId);

                    if (errGet) throw errGet;

                    if (detallesVenta && detallesVenta.length > 0) {
                        for (const item of detallesVenta) {
                            const { data: productoActual } = await supabaseClient
                                .from('producto')
                                .select('stock')
                                .eq('id_producto', item.id_producto)
                                .single();

                            if (productoActual) {
                                const stockRestaurado = productoActual.stock + item.cantidad;
                                await supabaseClient
                                    .from('producto')
                                    .update({ stock: stockRestaurado })
                                    .eq('id_producto', item.id_producto);
                            }
                        }
                    }

                    const { error: errDelete } = await supabaseClient
                        .from('venta') 
                        .delete()
                        .eq('id_venta', ventaSeleccionadaId);

                    if (errDelete) throw errDelete;

                    alert("¡Venta eliminada y artesanías devueltas al inventario con éxito!");
                    location.reload(); 
                } catch (err) {
                    alert("Error al eliminar o restaurar inventario: " + err.message);
                    console.error(err);
                }
            }
        };
    }
    
    async function cargarProductosDatalist() {
        try {
            const { data, error } = await supabaseClient
                .from('producto')
                .select('id_producto, nombre, precio');
                
            if (error) throw error;
            
            listaProductosBD = data; 
            const datalist = document.getElementById('lista-productos');
            
            if (datalist) {
                datalist.innerHTML = '';
                data.forEach(p => {
                    datalist.innerHTML += `<option value="${p.nombre}"></option>`;
                });
            }
        } catch (err) {
            console.error("Error al cargar productos para autocompletar:", err);
        }
    }

    const inputNombreArt = document.getElementById('v-artesania-nombre');
    if (inputNombreArt) {
        inputNombreArt.addEventListener('change', (e) => {
            const nombreEscrito = e.target.value;
            const productoEncontrado = listaProductosBD.find(p => p.nombre === nombreEscrito);
            
            // MODIFICADO: Bloqueo del precio dinámico
            const inputPrecio = document.getElementById('v-precio-unitario');
            if (productoEncontrado) {
                inputPrecio.value = productoEncontrado.precio;
                inputPrecio.readOnly = true; // <--- ¡MÁGICO! Se vuelve de sólo lectura al detectar el producto
            } else {
                inputPrecio.value = '';
                inputPrecio.readOnly = false; // Si se borra o escribe algo inválido, se libera
            }
        });
    }
    // === MOSTRAR/OCULTAR FECHA LÍMITE SEGÚN EL ESTADO DE PAGO ===
const selectEstado = document.getElementById('v-estado-pago');
const contenedorFecha = document.getElementById('contenedor-fecha-limite');
const etiquetaFecha = document.getElementById('etiqueta-fecha-limite');
const inputFechaLimite = document.getElementById('v-fecha-limite');

if (selectEstado && contenedorFecha) {
    selectEstado.addEventListener('change', (e) => {
        const valor = e.target.value;

        if (valor === 'Anticipo' || valor === 'Debe') {
            // Si debe o dio anticipo, mostramos el campo de fecha
            contenedorFecha.style.display = 'block';
            inputFechaLimite.required = true; // Forzamos a que pongan una fecha

            // Personalizamos el texto para que se vea más pro
            if (valor === 'Anticipo') {
                etiquetaFecha.textContent = "Fecha prometida de liquidación:";
            } else {
                etiquetaFecha.textContent = "Fecha límite para pagar deuda:";
            }
        } else {
            // Si ya está pagado, lo volvemos a esconder y limpiamos el dato
            contenedorFecha.style.display = 'none';
            inputFechaLimite.required = false;
            inputFechaLimite.value = '';
        }
    });
}
});