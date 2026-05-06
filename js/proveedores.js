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
                <td>#${prove.id_proveedor}</td>
                <td>${prove.nombre_proveedor}</td>
                <td>${prove.telefono || 'Sin teléfono'}</td>
                <td>${prove.direccion || 'Sin dirección'}</td>
                <td>
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
// 2. PREPARAR EDICIÓN (ABRIR MODAL)
// =====================================

window.prepararEdicion = async (id) => {
    proveedoresEditandoId = id;
    const modal = document.getElementById('modal-proveedor'); 
    if (modal) modal.showModal();

    try {
        const { data: proveedor, error } = await supabaseClient
            .from('proveedor').select('*').eq('id_proveedor', id).single(); 

        if (error) throw error;
    
        document.getElementById('proveedor-nombre').value = proveedor.nombre_proveedor;
        document.getElementById('proveedor-telefono').value = proveedor.telefono || '';
        document.getElementById('proveedor-direccion').value = proveedor.direccion || '';
    } catch (err) {
        console.error("Error:", err);
    }
}

// =====================================
// 3. ARRANCADOR Y BOTÓN DE GUARDAR
// =====================================
document.addEventListener('DOMContentLoaded', () => {
    // Reloj y Rol
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
    iniciarEncabezado();
    cargarProveedores();

    const modalProve = document.getElementById('modal-proveedor');
    const formProve = document.getElementById('form-proveedores');

    // === BOTÓN "REGISTRAR NUEVO" (Limpia el modal para agregar) ===
    const btnNuevo = document.getElementById('btn-nuevo-proveedor');
    if (btnNuevo) {
        btnNuevo.onclick = () => {
            proveedoresEditandoId = null; // MODO NUEVO
            formProve.reset();
            
            modalProve.showModal();
        };
    }

    // === BOTÓN CANCELAR ===
    const btnCancelar = document.getElementById('btn-cancelar-proveedor');
    if (btnCancelar) {
        btnCancelar.onclick = () => {
            modalProve.close();
            formProve.reset();
            proveedoresEditandoId = null;
        };
    }

    // === LÓGICA DE GUARDAR (INSERT O UPDATE) ===
    if (formProve) {
        formProve.onsubmit = async (e) => {
            e.preventDefault();

            // Obtenemos los valores de los inputs (asegúrate de que los IDs coincidan con tu HTML)
            const nombreVal = document.getElementById('proveedor-nombre').value;
            const direccionVal = document.getElementById('proveedor-direccion').value;
            const telefonoVal = document.getElementById('proveedor-telefono').value;

            try {
                if (proveedoresEditandoId) {
                    // SI HAY ID -> ACTUALIZAMOS (UPDATE)
                    const { error } = await supabaseClient
                        .from('proveedor')
                        .update({ 
                            nombre_proveedor: nombreVal, 
                            direccion: direccionVal, 
                            telefono: telefonoVal 
                        })
                        .eq('id_proveedor', proveedoresEditandoId);
                    
                    if (error) throw error;
                    alert('¡Proveedor actualizado!');
                } else {
                    // NO HAY ID -> INSERTAMOS (INSERT)
                    const { error } = await supabaseClient
                        .from('proveedor')
                        .insert([{ 
                            nombre_proveedor: nombreVal, 
                            direccion: direccionVal, 
                            telefono: telefonoVal 
                        }]);
                    
                    if (error) throw error;
                    alert('¡Nuevo proveedor registrado!');
                }

                formProve.reset();
                modalProve.close();
                proveedoresEditandoId = null;
                cargarProveedores(); // Refrescamos la tabla

            } catch (err) {
                alert("Error al guardar: " + err.message);
                console.error(err);
            }
        };
    }
});