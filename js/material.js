document.addEventListener('DOMContentLoaded', () => {
    // === VARIABLES GLOBALES ===
    let materialEditandoId = null;

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

    // --- 2. CARGAR Materiales ---
    async function cargarMaterial() {
        const cuerpo = document.getElementById('tabla-body-material');
        if (!cuerpo) return;
        
        cuerpo.innerHTML = '<tr><td colspan="5">Cargando productos...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('material')
                .select('*')
                .order('id_material', { ascending: false });

            if (error) throw error;
            cuerpo.innerHTML = '';

            data.forEach(m => {
                cuerpo.innerHTML += `
                    <tr>
                        <td data-label="ID">${m.id_material}</td>
                        <td data-label="Nombre">${m.nombre}</td>
                        <td data-label="Unidad">${m.unidad || ''}</td>
                        <td data-label="Stock">${m.stock}</td>
                        <td data-label="Acciones" class="solo-admin">
                            <button class="btn-editar" onclick="prepararEdicion(${m.id_material})">Editar</button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) {
            console.error(err);
            cuerpo.innerHTML = '<tr><td colspan="5">Error al cargar.</td></tr>';
        }
    }

    // --- 3. MANEJO DEL MODAL NUEVO ---
    const modalNuevo = document.getElementById('modal-nuevo-material');
    if(document.getElementById('btn-nuevo-material')){
        document.getElementById('btn-nuevo-material').onclick = () => {
            document.getElementById('form-nuevo-material').reset();            
            modalNuevo.showModal();
        };
    }

    if(document.getElementById('btn-cancelar-material')) {
        document.getElementById('btn-cancelar-material').onclick = () => modalNuevo.close();
    }


    // --- 4. GUARDAR NUEVO MATERIAL ---
    document.getElementById('form-nuevo-material').onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('material-nombre').value;
        const unidad = document.getElementById('material-unidad').value;
        const stockAAgregar = parseInt(document.getElementById('material-cantidad').value);

        try {
            const { error: errP } = await supabaseClient
                .from('material')
                .insert([{ nombre, unidad: unidad, stock: stockAAgregar }]);
            if (errP) throw errP;

            alert("¡Material guardado!");
            location.reload();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    // --- 5. EDICIÓN (ADJUNTA AL WINDOW) ---
    window.prepararEdicion = async (id) => {
        materialEditandoId = id;
        const modalEdit = document.getElementById('modal-editar-material'); 
        if (modalEdit) modalEdit.showModal();

        try {
            const { data: material, error } = await supabaseClient
                .from('material').select('*').eq('id_material', id).single(); 

            if (error) throw error;
    
            document.getElementById('edit-nombre').value = material.nombre;
            document.getElementById('edit-unidad').value = material.unidad || '';
            document.getElementById('edit-stock').value = material.stock || '';

        } catch (err) {
            console.error("Error al traer datos:", err);
        }
    };

    const btnCancelarEdit = document.getElementById('btn-cerrar-edit'); 
    if (btnCancelarEdit) {
        btnCancelarEdit.onclick = () => {
            document.getElementById('modal-editar-material').close();
            materialEditandoId = null;
        };
    }

    // GUARDAR EDICIÓN
    const formEditar = document.getElementById('form-editar-material');
    if (formEditar) {
        formEditar.onsubmit = async (e) => {
            e.preventDefault(); 
            const nombre = document.getElementById('edit-nombre').value;
            const unidad = document.getElementById('edit-unidad').value;
            const stock = parseInt(document.getElementById('edit-stock').value);

            try {
                
                const { error } = await supabaseClient
                    .from('material')
                    .update({ nombre, unidad, stock })
                    .eq('id_material', materialEditandoId); 

                if (error) throw error;
                alert('¡Material actualizado!');
                location.reload();
            } catch (err) {
                alert("Error al guardar: " + err.message);
            }
        };
    }
    // --- LÓGICA PARA ELIMINAR Material ---
    const btnEliminarP = document.getElementById('btn-eliminar-registro');
        if (btnEliminarP) {
            btnEliminarP.onclick = async () => {
        if (!materialEditandoId) return;

        const confirmar = confirm("¿Estás seguro de eliminar este material? Esta acción no se puede deshacer.");
        
        if (confirmar) {
            try {
                const { error } = await supabaseClient
                    .from('material') 
                    .delete()
                    .eq('id_material', materialEditandoId); 

                if (error) throw error;

                alert("¡Material eliminado del inventario!");
                location.reload(); 
            } catch (err) {
                alert("Error al eliminar: " + err.message);
            }
        }
        };
    }
    const inputBuscador = document.querySelector('.barra-busqueda input'); 

    if (inputBuscador) {
    // Escuchamos cada vez que Mauricio teclea una letra
        inputBuscador.addEventListener('keyup', (e) => {
            const textoBusqueda = e.target.value.toLowerCase();
        // Agarramos todas las filas de la tabla de materiales
            const filas = document.querySelectorAll('#tabla-body-material tr');

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

    iniciarEncabezado();
    cargarMaterial();
});

