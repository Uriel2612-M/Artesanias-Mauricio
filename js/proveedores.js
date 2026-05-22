let proveedoresEditandoId = null;

// =====================================
// 1. CARGAR PROVEEDORES (LEER)
// =====================================
async function cargarProveedores() {
    const cuerpoTabla = document.getElementById('tabla-proveedores-body');
    if (!cuerpoTabla) return;

    cuerpoTabla.innerHTML = '<tr><td colspan="5">Cargando datos...</td></tr>';

    try {
        const { data: proveedores, error } = await supabaseClient
            .from('proveedor')
            .select('*')
            .order('nombre_proveedor', { ascending: true }); 

        if (error) throw error;
        cuerpoTabla.innerHTML = '';

        if (proveedores.length === 0) {
            cuerpoTabla.innerHTML = '<tr><td colspan="5">No hay proveedores registrados.</td></tr>';
            return;
        }

        proveedores.forEach(prove => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td data-label="ID">#${prove.id_proveedor}</td>
                <td data-label="Nombre">${prove.nombre_proveedor}</td>
                <td data-label="Teléfono">${prove.telefono || 'Sin teléfono'}</td>
                <td data-label="Calle">${prove.calle || 'Sin calle'}</td>
                <td data-label="Número">${prove.numero_externo || 'Sin número'}</td>
                <td data-label="Colonia">${prove.colonia || 'Sin colonia'}</td>
                <td data-label="Ciudad">${prove.ciudad || 'Sin ciudad'}</td>
                <td data-label="Estado">${prove.estado || 'Sin estado'}</td>
                <td data-label="Acciones" class="solo-admin">
                    <button class="btn-editar" onclick="prepararEdicion(${prove.id_proveedor})">Editar</button>
                </td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    } catch (err) {
        console.error('Error:', err);
        cuerpoTabla.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar datos.</td></tr>';
    }
}

// =====================================
// 2. PREPARAR EDICIÓN (ABRIR MODAL DE EDICIÓN)
// =====================================
window.prepararEdicion = async (id) => {
    proveedoresEditandoId = id;
    const modalEdit = document.getElementById('modal-edit-proveedor'); 
    if (modalEdit) modalEdit.showModal();

    try {
        const { data: proveedor, error } = await supabaseClient
            .from('proveedor').select('*').eq('id_proveedor', id).single(); 

        if (error) throw error;
    
        // OJO: Usamos IDs diferentes para el modal de edición
        document.getElementById('edit-proveedor-nombre').value = proveedor.nombre_proveedor;
        document.getElementById('edit-proveedor-telefono').value = proveedor.telefono || '';
        document.getElementById('edit-proveedor-calle').value = proveedor.calle || '';
        document.getElementById('edit-proveedor-numero').value = proveedor.numero || '';
        document.getElementById('edit-proveedor-colonia').value = proveedor.colonia || '';
        document.getElementById('edit-proveedor-ciudad').value = proveedor.ciudad || '';
        document.getElementById('edit-proveedor-estado').value = proveedor.estado || '';
    } catch (err) {
        console.error("Error:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Reloj y Encabezado
    iniciarEncabezado();
    cargarProveedores();

    // --- MODAL REGISTRO ---
    const modalNuevo = document.getElementById('modal-proveedor');
    const formNuevo = document.getElementById('form-proveedores');
    const btnAbrirNuevo = document.getElementById('btn-nuevo-proveedor');
    const btnCancelarNuevo = document.getElementById('btn-cancelar-proveedor');

    if (btnAbrirNuevo) btnAbrirNuevo.onclick = () => modalNuevo.showModal();
    if (btnCancelarNuevo) btnCancelarNuevo.onclick = () => { modalNuevo.close(); formNuevo.reset(); };

    // Lógica de INSERT (Solo Registro)
    if (formNuevo) {
        formNuevo.onsubmit = async (e) => {
            e.preventDefault();
            const nombreVal = document.getElementById('proveedor-nombre').value;
            const telefonoVal = document.getElementById('proveedor-telefono').value;
            const calle = document.getElementById('proveedor-calle').value;
            const numero = document.getElementById('proveedor-numero').value;
            const colonia = document.getElementById('proveedor-colonia').value;
            const ciudad = document.getElementById('proveedor-ciudad').value;
            const estado = document.getElementById('proveedor-estado').value;

            try {
                const { error } = await supabaseClient
                    .from('proveedor')
                    .insert([{ 
                        nombre_proveedor: nombreVal, 
                        telefono: telefonoVal, 
                        calle: calle || null,
                        numero_externo: numero || null,
                        colonia: colonia || null,
                        ciudad: ciudad || null,
                        estado: estado || null 
                    }]);
                
                if (error) throw error;
                alert('¡Nuevo proveedor registrado!');
                formNuevo.reset();
                modalNuevo.close();
                cargarProveedores();
            } catch (err) {
                alert("Error al registrar: " + err.message);
            }
        };
    }

    // --- MODAL EDICIÓN ---
    const modalEdit = document.getElementById('modal-edit-proveedor');
    const formEdit = document.getElementById('form-editar-proveedor');
    const btnCancelarEdit = document.getElementById('btn-cancelar-edit-proveedor');

    if (btnCancelarEdit) btnCancelarEdit.onclick = () => { modalEdit.close(); proveedoresEditandoId = null; };

    // Lógica de UPDATE (Solo Edición)
    if (formEdit) {
        formEdit.onsubmit = async (e) => {
            e.preventDefault();
            const nombreVal = document.getElementById('edit-proveedor-nombre').value;
            const telefonoVal = document.getElementById('edit-proveedor-telefono').value;
            const calle = document.getElementById('edit-proveedor-calle').value;
            const numero = document.getElementById('edit-proveedor-numero').value;
            const colonia = document.getElementById('edit-proveedor-colonia').value;
            const ciudad = document.getElementById('edit-proveedor-ciudad').value;
            const estado = document.getElementById('edit-proveedor-estado').value;

            try {
                const { error } = await supabaseClient
                    .from('proveedor')
                    .update({ 
                        nombre_proveedor: nombreVal, 
                        telefono: telefonoVal,
                        calle: calle || null, 
                        numero_externo: numero || null,
                        colonia: colonia || null,
                        ciudad: ciudad || null,
                        estado: estado || null
                    })  
                    .eq('id_proveedor', proveedoresEditandoId);
                
                if (error) throw error;
                alert('¡Proveedor actualizado!');
                modalEdit.close();
                proveedoresEditandoId = null;
                cargarProveedores();
            } catch (err) {
                alert("Error al actualizar: " + err.message);
            }
        };
    }

    // --- BOTÓN ELIMINAR ---
    const btnEliminar = document.getElementById('btn-eliminar-proveedor');
    if (btnEliminar) {
        btnEliminar.onclick = async () => {
            if (!proveedoresEditandoId) return;
            const confirmar = confirm("¿Seguro que quieres borrar a este proveedor?");
            if (confirmar) {
                try {
                    const { error } = await supabaseClient
                        .from('proveedor') 
                        .delete()
                        .eq('id_proveedor', proveedoresEditandoId); 
                    if (error) throw error;
                    alert("Proveedor eliminado");
                    location.reload(); 
                } catch (err) {
                    alert("Error: " + err.message);
                }
            }
        };
    }

    // Buscador (Mantenemos tu lógica pro)
    const inputBuscador = document.querySelector('.barra-busqueda input'); 
    if (inputBuscador) {
        inputBuscador.addEventListener('keyup', (e) => {
            const texto = e.target.value.toLowerCase();
            const filas = document.querySelectorAll('#tabla-proveedores-body tr');
            filas.forEach(f => f.style.display = f.textContent.toLowerCase().includes(texto) ? '' : 'none');
        });
    }
});

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