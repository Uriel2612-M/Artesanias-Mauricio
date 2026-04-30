document.addEventListener('DOMContentLoaded', () => {
    let carrito = [];
    let totalVenta = 0;

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
        modal.close();
        carrito = [];
        renderizarCarrito();
    };

    // --- 3. CARRITO TEMPORAL ---
    document.getElementById('btn-agregar-item').onclick = () => {
        const nombreArt = document.getElementById('v-artesania-nombre').value;
        const cant = parseInt(document.getElementById('v-cantidad').value);
        const precioManual = parseFloat(document.getElementById('v-precio-unitario').value);

        if(nombreArt && cant > 0 && precioManual > 0) {
            carrito.push({ 
                id_producto: 1, 
                nombre: nombreArt, 
                cant, 
                precio: precioManual, 
                subtotal: cant * precioManual 
            });
            
            document.getElementById('v-artesania-nombre').value = '';
            document.getElementById('v-cantidad').value = '1';
            document.getElementById('v-precio-unitario').value = '';
            
            renderizarCarrito();
        } else {
            alert("Pon nombre, cantidad y precio válido, apa.");
        }
    };

    function renderizarCarrito() {
        const cuerpo = document.getElementById('cuerpo-carrito');
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
        // AQUÍ ESTÁ EL TRUCO: Actualizamos el texto y el input oculto para la resta
        document.getElementById('total-pre-venta').textContent = totalVenta;
        if(document.getElementById('v-total-calculado')) {
            document.getElementById('v-total-calculado').value = totalVenta;
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
            const { data: nuevoCliente, error: errCliente } = await supabaseClient
                .from('cliente')
                .insert([{
                    nombre: document.getElementById('v-nombre').value,
                    apellidos: document.getElementById('v-apellidos').value,
                    telefono: document.getElementById('v-telefono').value
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
                    estado_pago: document.getElementById('v-estado-pago').value
                }])
                .select().single();

            if (errVenta) throw errVenta;

            // 3. Insertar Detalles
            const detalles = carrito.map(item => ({
                id_venta: nuevaVenta.id_venta,
                id_producto: 1, 
                cantidad: item.cant,
                precio_unitario: item.precio
            }));

            const { error: errDetalle } = await supabaseClient
                .from('detalle_venta').insert(detalles);

            if (errDetalle) throw errDetalle;

            alert("¡Venta registrada con éxito, apa!");
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
                cliente ( id_cliente, nombre, apellidos, telefono ),
                detalle_venta ( cantidad, producto ( nombre ) )
            `);

        if (error) throw error;

        const cuerpoV = document.getElementById('cuerpo-ventas');
        cuerpoV.innerHTML = '';

        if (data) {
            data.forEach(v => {
                const nom = v.cliente ? v.cliente.nombre : 'Público';
                const ape = v.cliente ? v.cliente.apellidos : 'General';
                const tel = v.cliente ? v.cliente.telefono : '-';
                const nombresArt = v.detalle_venta?.map(d => `${d.producto?.nombre} (x${d.cantidad})`).join(', ') || 'Sin productos';
                
                // LÓGICA DE SEGURIDAD PARA DATOS VIEJOS:
                const totalReal = v.total_venta || v.monto_pagado || 0;
                const abono = v.monto_pagado || 0;
                const saldo = totalReal - abono;
                
                const ventaJSON = JSON.stringify(v).replace(/"/g, '&quot;');
                let fechaFormateada = 'Sin fecha';
                if (v.fecha) {
                fechaFormateada = new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
                }
                
                cuerpoV.innerHTML += `
                    <tr>
                        <td>
                            <strong>${v.id_venta}</strong><br>
                            <small style="color: #888; font-size: 0.8em;">${fechaFormateada}</small>
                        </td>
                        <td>${nom}</td>              
                        <td>${ape}</td>               
                        <td>${tel}</td>               
                        <td>${nombresArt}</td>        
                        <td>$${totalReal}</td>        
                        <td>$${abono}</td>            
                        <td style="color: ${saldo > 0 ? 'red' : '#a8e42f'}">$${saldo.toFixed(2)}</td> 
                        <td>${v.estado_pago}</td>
                        <td> <button class="btn-editar" onclick="abrirEditorVenta('${ventaJSON}')">Editar</button>
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
        const modalEdit = document.getElementById('modal-editar-venta');
        
        // IDs
        document.getElementById('edit-id-venta').value = v.id_venta;
        document.getElementById('edit-id-cliente').value = v.cliente?.id_cliente || v.id_cliente;

        // Cliente
        document.getElementById('edit-nombre').value = v.cliente?.nombre || '';
        document.getElementById('edit-apellidos').value = v.cliente?.apellidos || '';
        document.getElementById('edit-telefono').value = v.cliente?.telefono || '';

        // Dinero (Aquí es donde Mauricio actualiza el pago)
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

    iniciarEncabezado();
    cargarVentas();

    document.getElementById('form-editar-venta').onsubmit = async (e) => {
    e.preventDefault();
    
    const idV = document.getElementById('edit-id-venta').value;
    const idC = document.getElementById('edit-id-cliente').value;
    
    // Capturamos los nuevos valores del Modal
    const nuevoAbono = parseFloat(document.getElementById('edit-monto-pagado').value);
    const nuevoEstado = document.getElementById('edit-estado-pago').value;

    try {
        // 1. Actualizar Cliente
        await supabaseClient.from('cliente').update({
            nombre: document.getElementById('edit-nombre').value,
            apellidos: document.getElementById('edit-apellidos').value,
            telefono: document.getElementById('edit-telefono').value
        }).eq('id_cliente', idC);

        // 2. Actualizar Venta (Dinero y Estado)
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
});