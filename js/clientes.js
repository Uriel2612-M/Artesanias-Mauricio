let clienteEditandoId = null;


// =====================================
// 1. CARGAR CLIENTES (LEER)
// =====================================
async function cargarClientes() {
    
    const cuerpoTabla = document.getElementById('tabla-clientes-body');
    
    if (!cuerpoTabla) return;

    cuerpoTabla.innerHTML = '<tr><td colspan="5">Cargando datos...</td></tr>';

    try {
        // Hacemos UNA SOLA consulta ya con la línea mágica integrada
        const { data: clientes, error } = await supabaseClient
            .from('cliente')
            .select('*')
            .eq('Activo', true) // <--- Minúsculas para que no truene el JS
            .order('nombre', { ascending: true });

        if (error) throw error;

        cuerpoTabla.innerHTML = '';

        if (clientes.length === 0) {
            cuerpoTabla.innerHTML = '<tr><td colspan="5">No hay clientes registrados o todos están inactivos.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const fila = document.createElement('tr');
            
            fila.innerHTML = `
                <td data-label="ID">#${cliente.id_cliente}</td>
                <td data-label="Nombre">${cliente.nombre}</td>
                <td data-label="Apellido Paterno">${cliente.apellido_pat || ''}</td>
                <td data-label="Apellido Materno">${cliente.apellido_mat || ''}</td>
                <td data-label="Teléfono">${cliente.telefono || 'Sin teléfono'}</td>
                <td data-label="Acciones" class="solo-admin">
                    <button class="btn-editar" onclick="prepararEdicion(${cliente.id_cliente})">Editar</button>
                </td>
            `;
            cuerpoTabla.appendChild(fila);
        });

    } catch (err) {
        console.error('Error al traer clientes:', err);
        cuerpoTabla.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar datos.</td></tr>';
    }
}

// =====================================
// 2. PREPARAR EDICIÓN (ABRIR MODAL)
// =====================================
async function prepararEdicion(id) {
    clienteEditandoId = id;
    console.log("Editando al cliente ID:", id); 
    
    const modal = document.getElementById('modal-cliente'); 
    if (modal) modal.showModal();

    try {
        const { data: cliente, error } = await supabaseClient
            .from('cliente')
            .select('*')
            .eq('id_cliente', id) 
            .single(); 

        if (error) throw error;
    
        document.getElementById('cliente-nombre').value = cliente.nombre;
        document.getElementById('cliente-apellido_pat').value = cliente.apellido_pat || '';
        document.getElementById('cliente-apellido_mat').value = cliente.apellido_mat || '';
        document.getElementById('cliente-telefono').value = cliente.telefono || '';

    } catch (err) {
        console.error("Error al traer datos para editar:", err);
        alert("Hubo un error al intentar editar. Checa la consola.");
    }
}

// =====================================
// 3. ARRANCADOR Y BOTÓN DE GUARDAR
// =====================================

document.addEventListener('DOMContentLoaded', () => {
    
    function capitalizarTexto(texto) {
        if (!texto) return ''; // Si está vacío, no hace nada
        return texto.toLowerCase().replace(/\b\w/g, letra => letra.toUpperCase());
    }

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
    cargarClientes();
    
    const formCliente = document.getElementById('form-cliente');
    const modalCliente = document.getElementById('modal-cliente'); 

    // =====================================
    // BOTÓN CANCELAR
    // =====================================
    const btnCancelar = document.getElementById('btn-cancelar-cliente'); 
    if (btnCancelar) {
        btnCancelar.onclick = () => {
            if (modalCliente) modalCliente.close();
            if (formCliente) formCliente.reset();  
            clienteEditandoId = null;              
        };
    }
    if (formCliente) {
        formCliente.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const nombre = capitalizarTexto(document.getElementById('cliente-nombre').value);
            const apellido_pat = capitalizarTexto(document.getElementById('cliente-apellido_pat').value);
            const apellido_mat = capitalizarTexto(document.getElementById('cliente-apellido_mat').value);
            const telefono = capitalizarTexto(document.getElementById('cliente-telefono').value);

            try {
                if (clienteEditandoId) {
                    
                    const { error } = await supabaseClient
                        .from('cliente')
                        .update({ nombre: nombre, apellido_pat: apellido_pat, apellido_mat: apellido_mat, telefono: telefono })
                        .eq('id_cliente', clienteEditandoId); 

                    if (error) throw error;
                    alert('¡Cliente actualizado!');

                } else {
                    
                    const { error } = await supabaseClient
                        .from('cliente')
                        .insert([{ nombre: nombre, apellido_pat: apellido_pat, apellido_mat: apellido_mat, telefono: telefono }]);

                    if (error) throw error;
                    alert('¡Cliente nuevo registrado!');
                }

                formCliente.reset();
                clienteEditandoId = null;
                document.getElementById('modal-cliente').close();


                cargarClientes();

            } catch (err) {
                console.error("Error al guardar en BD:", err);
                alert("Hubo un error al guardar. Checa la consola, apa.");
            }
        });
    }
    const inputBuscador = document.querySelector('.barra-busqueda input'); 

    if (inputBuscador) {
    // Escuchamos cada vez que Mauricio teclea una letra
        inputBuscador.addEventListener('keyup', (e) => {
            const textoBusqueda = e.target.value.toLowerCase();
        // Agarramos todas las filas de la tabla de clientes
            const filas = document.querySelectorAll('#tabla-clientes-body tr');

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
const btnEliminarCliente = document.getElementById('btn-eliminar-cliente');

if (btnEliminarCliente) {
    btnEliminarCliente.onclick = async () => {
        // Usamos la variable global que guarda el ID del cliente seleccionado
        if (!clienteEditandoId) return;

        const confirmar = confirm("¿Estás seguro de quitar a este cliente de la lista? Sus ventas pasadas se mantendrán en el historial.");
        
        if (confirmar) {
            try {
                // CAMBIO CLAVE: Cambiamos .delete() por .update()
                const { error } = await supabaseClient
                    .from('cliente')
                    .update({ Activo: false }) 
                    .eq('id_cliente', clienteEditandoId);

                if (error) throw error;

                alert("Cliente removido con éxito.");
                location.reload(); 
            } catch (err) {
                alert("Error al remover cliente: " + err.message);
            }
        }
    };
}
});


