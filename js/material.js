document.addEventListener('DOMContentLoaded', () => {
    function capitalizarTexto(texto) {
        if (!texto) return ''; // Si está vacío, no hace nada
        return texto.toLowerCase().replace(/\b\w/g, letra => letra.toUpperCase());
    }
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
        
        cuerpo.innerHTML = '<tr><td colspan="6">Cargando productos...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('material')
                .select('*')
                .order('id_material', { ascending: false });

            if (error) throw error;
            cuerpo.innerHTML = '';

            data.forEach(m => {
                let diseñoCaducidad = 'No aplica';
                let estiloAlerta = ''; // Para cambiar el color de la fila o letra

                if (m.fecha_caducidad) {
                    const hoy = new Date();
                    // Le sumamos las horas para evitar el desfase de zona horaria
                    const fechaCad = new Date(m.fecha_caducidad + 'T12:00:00'); 
                    
                    // Calculamos cuántos días faltan
                    const diferenciaTiempo = fechaCad.getTime() - hoy.getTime();
                    const diasFaltantes = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));
                    const fechaFormateada = fechaCad.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

                    if (diasFaltantes < 0) {                    
                        diseñoCaducidad = `<span style="color: red; font-weight: bold;">${fechaFormateada} (Caducado)</span>`;
                        estiloAlerta = 'background-color: #ffe6e6;'; // Fila rojita clara
                    } else if (diasFaltantes <= 30) {
                        diseñoCaducidad = `<span style="color: #ff9800; font-weight: bold;">${fechaFormateada} (Pronto)</span>`;
                    } else {
                        diseñoCaducidad = fechaFormateada;
                    }
                }
                cuerpo.innerHTML += `
                    <tr>
                        <td data-label="ID">${m.id_material}</td>
                        <td data-label="Nombre">${m.nombre}</td>
                        <td data-label="Precio Unitario" class="solo-admin">${m.costo_unitario ? '$' + m.costo_unitario.toFixed(2) : ''} MXN</td>
                        <td data-label="Unidad">${m.unidad || ''}</td>
                        <td data-label="Stock">${m.stock}</td>
                        <td data-label="Caducidad">${diseñoCaducidad}</td>
                        <td data-label="Acciones" class="solo-admin">
                            <button class="btn-editar" onclick="prepararEdicion(${m.id_material})">Editar</button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) {
            console.error(err);
            cuerpo.innerHTML = '<tr><td colspan="6">Error al cargar.</td></tr>';
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
        document.getElementById('btn-cancelar-material').onclick = () => {
        document.getElementById('form-nuevo-material').reset(); 
            modalNuevo.close();
        };
    }


    // --- 4. GUARDAR NUEVO MATERIAL ---

    const fechaLocal = new Date();
    const hoy = fechaLocal.getFullYear() + '-' + 
                String(fechaLocal.getMonth() + 1).padStart(2, '0') + '-' + 
                String(fechaLocal.getDate()).padStart(2, '0');
    
    // 2. Aplicamos el candado al calendario (Tu lógica aquí ya estaba perfecta)
    const inputCaducidad = document.getElementById('mat-caducidad');
    if (inputCaducidad) {
        inputCaducidad.min = hoy; // Ayer y atrás aparecerán deshabilitados
    }
    document.getElementById('form-nuevo-material').onsubmit = async (e) => {
        e.preventDefault();
        const nombre = capitalizarTexto(document.getElementById('material-nombre').value);
        const unidad = capitalizarTexto(document.getElementById('material-unidad').value);
        const stockAAgregar = parseInt(document.getElementById('material-cantidad').value);
        const precioCostoInicial = parseFloat(document.getElementById('precio-unitario').value) || 0;
        const caducidad = document.getElementById('mat-caducidad').value || null;

        try {
            const { error: errP } = await supabaseClient
                .from('material')
                .insert([{ nombre, unidad: unidad, stock: stockAAgregar, costo_unitario: precioCostoInicial, fecha_caducidad: caducidad }]);
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
    
            document.getElementById('edit-nombre').value = capitalizarTexto(material.nombre);
            document.getElementById('edit-precio').value = material.costo_unitario || '';
            document.getElementById('edit-unidad').value = capitalizarTexto(material.unidad) || '';
            document.getElementById('edit-stock').value = material.stock || '';
            document.getElementById('edit-caducidad').value = material.fecha_caducidad ? material.fecha_caducidad.split('T')[0] : '';

        } catch (err) {
            console.error("Error al traer datos:", err);
        }
    };

    // 2. Atrapamos LA CAJA HTML (sin el .value)
    const inputCaducidadEdit = document.getElementById('edit-caducidad');

    // 3. Le aplicamos el candado al calendario para que bloquee el pasado
        if (inputCaducidadEdit) {
            inputCaducidadEdit.min = hoy; 
        }
    const formEditar = document.getElementById('form-editar-material');
    if (formEditar) {
        formEditar.onsubmit = async (e) => {
            e.preventDefault(); 
            const nombre = capitalizarTexto(document.getElementById('edit-nombre').value);
            const unidad = capitalizarTexto(document.getElementById('edit-unidad').value);
            const stock = parseInt(document.getElementById('edit-stock').value);
            const precioCostoInicial = parseFloat(document.getElementById('edit-precio').value) || 0;
            const caducidadFinal = document.getElementById('edit-caducidad').value || null;

            if (caducidadFinal && caducidadFinal < hoy) {
            alert("¡Error! No puedes poner una fecha de caducidad que ya pasó.");
            return; // <--- Aborta la misión, no manda nada a la base de datos
            }
            try {
                
                const { error } = await supabaseClient
                    .from('material')
                    .update({ nombre, unidad, stock, costo_unitario: precioCostoInicial, fecha_caducidad: caducidadFinal })
                    .eq('id_material', materialEditandoId); 

                if (error) throw error;
                alert('¡Material actualizado!');
                location.reload();
            } catch (err) {
                alert("Error al guardar: " + err.message);
            }
        };
    }
    const btnCancelar = document.getElementById('btn-cerrar-edit');

if (btnCancelar) {
    btnCancelar.onclick = (e) => {
        e.preventDefault(); // Frenamos cualquier intento de recargar la página

        // 1. Limpiamos el estado sucio del formulario
        const formEdit = document.getElementById('form-editar-material');
        if (formEdit) formEdit.reset(); 
        
        // 2. Atrapamos el modal directamente del DOM y lo cerramos
        const modalVisual = document.getElementById('modal-editar-material'); 
        if (modalVisual) {
            modalVisual.close();
        } else {
            console.error("No encontré el modal en el HTML, revisa el ID.");
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

