document.addEventListener('DOMContentLoaded', () => {
    // === VARIABLES GLOBALES ===
    let materialesParaArtesania = []; 
    let listaMaterialesBD = []; 
    let productoEditandoId = null;

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

    // --- 2. CARGAR PRODUCTOS ---
    async function cargarProductos() {
        const cuerpo = document.getElementById('tabla-producto-body');
        if (!cuerpo) return;
        
        cuerpo.innerHTML = '<tr><td colspan="6">Cargando productos...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('producto')
                .select('*')
                .order('id_producto', { ascending: false });

            if (error) throw error;
            cuerpo.innerHTML = '';

            data.forEach(p => {
                cuerpo.innerHTML += `
                    <tr>
                        <td>${p.id_producto}</td>
                        <td>${p.nombre}</td>
                        <td>${p.unidad || p.unidad_medida || ''}</td>
                        <td>$${p.precio}</td>
                        <td>${p.stock}</td>
                        <td>
                            <button class="btn-editar" onclick="prepararEdicion(${p.id_producto})">Editar</button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) {
            console.error(err);
            cuerpo.innerHTML = '<tr><td colspan="6">Error al cargar.</td></tr>';
        }
    }

    // --- 3. CARGAR MATERIALES ---
    async function cargarSelectMateriales() {
        try {
            const { data, error } = await supabaseClient
                .from('material')
                .select('id_material, nombre, stock');
            
            if (error) throw error;
            listaMaterialesBD = data;

            const select = document.getElementById('material-select');
            if (select && select.tagName === 'SELECT') {
                select.innerHTML = '<option value="">-- Elige material --</option>';
                data.forEach(m => {
                    select.innerHTML += `<option value="${m.id_material}">${m.nombre} (Stock: ${m.stock})</option>`;
                });
            }
        } catch (err) {
            console.error("Error al cargar materiales:", err);
        }
    }

    // --- 4. MANEJO DEL MODAL NUEVO ---
    const modalNuevo = document.getElementById('modal-nueva-artesania');
    if(document.getElementById('btn-nueva-artesania')){
        document.getElementById('btn-nueva-artesania').onclick = () => {
            document.getElementById('form-nueva-artesania').reset();
            materialesParaArtesania = []; 
            renderizarMaterialesTemp();
            modalNuevo.showModal();
        };
    }

    if(document.getElementById('btn-cancelar-producto')) {
        document.getElementById('btn-cancelar-producto').onclick = () => modalNuevo.close();
    }

    // --- 5. LÓGICA MATERIALES (+) ---
    const btnMas = document.querySelector('.btn-secundario'); 
    if (btnMas) {
        btnMas.onclick = () => {
            const select = document.getElementById('material-select');
            const idMat = select.value;
            const cantMat = parseInt(document.getElementById('material-cantidad').value);

            if (idMat && cantMat > 0) {
                const matInfo = listaMaterialesBD.find(m => m.id_material == idMat);
                materialesParaArtesania.push({
                    id: idMat,
                    nombre: matInfo ? matInfo.nombre : 'Material',
                    cant: cantMat
                });
                renderizarMaterialesTemp();
                document.getElementById('material-cantidad').value = '';
            } else {
                alert("Selecciona material y cantidad, apa.");
            }
        };
    }

    function renderizarMaterialesTemp() {
        const cuerpo = document.querySelector('#form-nueva-artesania table tbody');
        if (!cuerpo) return;
        cuerpo.innerHTML = '';
        materialesParaArtesania.forEach((m, index) => {
            cuerpo.innerHTML += `
                <tr>
                    <td style="padding: 10px;">${m.nombre}</td>
                    <td style="padding: 10px;">${m.cant}</td>
                    <td style="padding: 10px;">
                        <button type="button" onclick="quitarMat(${index})" style="background:red; color:white; border:none; border-radius:3px; cursor:pointer;">Quitar</button>
                    </td>
                </tr>`;
        });
    }

    window.quitarMat = (index) => {
        materialesParaArtesania.splice(index, 1);
        renderizarMaterialesTemp();
    };

    // --- 6. GUARDAR NUEVO PRODUCTO ---
    document.getElementById('form-nueva-artesania').onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('artesania-nombre').value;
        const unidad = document.getElementById('artesania-unidad').value;
        const precio = parseFloat(document.getElementById('artesania-precio').value);
        const stockAAgregar = parseInt(document.getElementById('artesania-cantidad').value);

        try {
            const { error: errP } = await supabaseClient
                .from('producto')
                .insert([{ nombre, unidad: unidad, precio, stock: stockAAgregar }]);
            if (errP) throw errP;

            for (const item of materialesParaArtesania) {
                const matOriginal = listaMaterialesBD.find(m => m.id_material == item.id);
                if (matOriginal) {
                    const nuevoStockMat = matOriginal.stock - (item.cant * stockAAgregar);
                    await supabaseClient.from('material').update({ stock: nuevoStockMat }).eq('id_material', item.id);
                }
            }
            alert("¡Artesanía guardada!");
            location.reload();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    // --- 7. EDICIÓN (ADJUNTA AL WINDOW) ---
    window.prepararEdicion = async (id) => {
        productoEditandoId = id;
        const modalEdit = document.getElementById('modal-editar-producto'); 
        if (modalEdit) modalEdit.showModal();

        try {
            const { data: producto, error } = await supabaseClient
                .from('producto').select('*').eq('id_producto', id).single(); 

            if (error) throw error;
    
            document.getElementById('edit-nombre').value = producto.nombre;
            document.getElementById('edit-unidad').value = producto.unidad || producto.unidad_medida || '';
            document.getElementById('edit-precio').value = producto.precio || '';
            document.getElementById('edit-stock').value = producto.stock || '';

        } catch (err) {
            console.error("Error al traer datos:", err);
        }
    };

    const btnCancelarEdit = document.getElementById('btn-cerrar-edit'); 
    if (btnCancelarEdit) {
        btnCancelarEdit.onclick = () => {
            document.getElementById('modal-editar-producto').close();
            productoEditandoId = null;
        };
    }

    // GUARDAR EDICIÓN
    const formEditar = document.getElementById('form-editar-producto');
    if (formEditar) {
        formEditar.onsubmit = async (e) => {
            e.preventDefault(); 
            const nombre = document.getElementById('edit-nombre').value;
            const unidad = document.getElementById('edit-unidad').value;
            const precio = parseFloat(document.getElementById('edit-precio').value);
            const stock = parseInt(document.getElementById('edit-stock').value);

            try {
                
                const { error } = await supabaseClient
                    .from('producto')
                    .update({ nombre, unidad, precio, stock })
                    .eq('id_producto', productoEditandoId); 

                if (error) throw error;
                alert('¡Producto actualizado!');
                location.reload();
            } catch (err) {
                alert("Error al guardar: " + err.message);
            }
        };
    }
    // --- LÓGICA PARA ELIMINAR ARTESANÍA ---
    const btnEliminarP = document.getElementById('btn-eliminar-registro');
        if (btnEliminarP) {
            btnEliminarP.onclick = async () => {
        
        if (!productoEditandoId) return;

        const confirmar = confirm("¿Estás seguro de eliminar esta artesanía? Esta acción no se puede deshacer.");
        
        if (confirmar) {
            try {
                const { error } = await supabaseClient
                    .from('producto') 
                    .delete()
                    .eq('id_producto', productoEditandoId);

                if (error) throw error;

                alert("¡Artesanía eliminada del inventario!");
                location.reload(); 
            } catch (err) {
                alert("Error al eliminar: " + err.message);
            }
        }
    };
    }

    iniciarEncabezado();
    cargarProductos();
    cargarSelectMateriales();
});

