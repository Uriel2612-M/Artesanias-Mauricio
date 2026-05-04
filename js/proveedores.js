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
    
    const formProve = document.getElementById('form-proveedores');
    const modalProve = document.getElementById('modal-proveedor'); 

    // BOTÓN CANCELAR
    const btnCancelar = document.getElementById('btn-cancelar-proveedor'); 
    if (btnCancelar) {
        btnCancelar.onclick = () => {
            if (modalProve) modalProve.close();
            if (formProve) formProve.reset();  
            proveedoresEditandoId = null;               
        };
    }

    if (formProve) {
        formProve.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            const nombre = document.getElementById('proveedor-nombre').value;
            const direccion = document.getElementById('proveedor-direccion').value;
            const telefono = document.getElementById('proveedor-telefono').value;

            try {
                if (proveedoresEditandoId) {
                    const { error } = await supabaseClient
                        .from('proveedor')
                        .update({ nombre_proveedor: nombre, direccion: direccion, telefono: telefono })
                        .eq('id_proveedor', proveedoresEditandoId); 
                    if (error) throw error;
                    alert('¡Proveedor actualizado!');
                } else {
                    const { error } = await supabaseClient
                        .from('proveedor')
                        .insert([{ nombre_proveedor: nombre, direccion: direccion, telefono: telefono }]);
                    if (error) throw error;
                    alert('¡Proveedor nuevo registrado!');
                }

                formProve.reset();
                proveedoresEditandoId = null;
                modalProve.close();
                cargarProveedores(); 
            } catch (err) {
                alert("Error al guardar: " + err.message);
            }
        });
    }
});
