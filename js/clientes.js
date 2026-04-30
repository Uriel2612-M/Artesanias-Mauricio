let clienteEditandoId = null;

// =====================================
// 1. CARGAR CLIENTES (LEER)
// =====================================
async function cargarClientes() {
    const cuerpoTabla = document.getElementById('tabla-clientes-body');
    
    if (!cuerpoTabla) return;

    cuerpoTabla.innerHTML = '<tr><td colspan="5">Cargando datos...</td></tr>';

    try {
        const { data: clientes, error } = await supabaseClient
            .from('cliente')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        cuerpoTabla.innerHTML = '';

        if (clientes.length === 0) {
            cuerpoTabla.innerHTML = '<tr><td colspan="5">No hay clientes registrados.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const fila = document.createElement('tr');
            
            fila.innerHTML = `
                <td>#${cliente.id_cliente}</td>
                <td>${cliente.nombre}</td>
                <td>${cliente.apellidos || ''}</td> 
                <td>${cliente.telefono || 'Sin teléfono'}</td>
                <td>
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
        document.getElementById('cliente-apellidos').value = cliente.apellidos || '';
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
    
    
    cargarClientes();
    
    const formCliente = document.getElementById('form-cliente');
    
    if (formCliente) {
        formCliente.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const nombre = document.getElementById('cliente-nombre').value;
            const apellidos = document.getElementById('cliente-apellidos').value;
            const telefono = document.getElementById('cliente-telefono').value;

            try {
                if (clienteEditandoId) {
                    
                    const { error } = await supabaseClient
                        .from('cliente')
                        .update({ nombre: nombre, apellidos: apellidos, telefono: telefono })
                        .eq('id_cliente', clienteEditandoId); 

                    if (error) throw error;
                    alert('¡Cliente actualizado al cien!');

                } else {
                    
                    const { error } = await supabaseClient
                        .from('cliente')
                        .insert([{ nombre: nombre, apellidos: apellidos, telefono: telefono }]);

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
});

let ventasEditandoId = null;
