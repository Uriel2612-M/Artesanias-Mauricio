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
        
        cuerpo.innerHTML = '<tr><td colspan="7">Cargando productos...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('producto')
                .select('*')
                .order('id_producto', { ascending: false });

            if (error) throw error;
            cuerpo.innerHTML = '';

            data.forEach(p => {
                const costo = p.costo_producto || 0;
                const venta = p.precio || 0;
                const ganancia = venta - costo; 
                cuerpo.innerHTML += `
                    <tr>
                        <td data-label="ID">${p.id_producto}</td>
                        <td data-label="Nombre">${p.nombre}</td>
                        <td data-label="Unidad">${p.unidad || p.unidad_medida || ''}</td>
                        <td data-label="Precio Costo" class="solo-admin">$${p.costo_producto  || '0.00'} MXN</td>
                        <td data-label="Precio">$${p.precio || '0.00'} MXN</td>
                        <td data-label="Ganancia" class="solo-admin" style="color: #a8e42f; font-weight: bold;">+$${ganancia.toFixed(2)} MXN</td>
                        <td data-label="Stock">${p.stock}</td>
                        <td data-label="Acciones" class="solo-admin">
                            <button class="btn-editar" onclick="prepararEdicion(${p.id_producto})">Editar</button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) {
            console.error(err);
            cuerpo.innerHTML = '<tr><td colspan="7">Error al cargar.</td></tr>';
        }
    }

    // --- 4. MANEJO DEL MODAL NUEVO ---
    const modalNuevo = document.getElementById('modal-nueva-artesania');
    if(document.getElementById('btn-nueva-artesania')){
        document.getElementById('btn-nueva-artesania').onclick = () => {
            document.getElementById('form-nueva-artesania').reset();
            materialesParaArtesania = []; 
            renderizarMaterialesTemp();
            calcularPreciosSugeridos();
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
                        
            const inputMaterial = document.getElementById('material-nombre');
            const nombreEscrito = inputMaterial.value; 
            const cantMat = parseInt(document.getElementById('material-cantidad').value);
            const matInfo = listaMaterialesBD.find(m => m.nombre === nombreEscrito);
            if (matInfo && cantMat > 0) {
                materialesParaArtesania.push({
                    id: matInfo.id_material, 
                    nombre: matInfo.nombre,
                    cant: cantMat
                });
                renderizarMaterialesTemp();
                calcularPreciosSugeridos();
                
                inputMaterial.value = '';
                document.getElementById('material-cantidad').value = '';
            } else {
                alert("Escribe un material válido de la lista y una cantidad mayor a 0.");
            }
        };
    }
    // === FUNCIÓN PARA CALCULAR PRECIOS SUGERIDOS EN VIVO ===
function calcularPreciosSugeridos() {
        let costoTotalMateriales = 0;

        materialesParaArtesania.forEach(item => {
            const matBD = listaMaterialesBD.find(m => m.id_material == item.id);
            if (matBD) {
                costoTotalMateriales += (item.cant * parseFloat(matBD.costo_unitario || 0));
            }
        });

        const ventaSugerida = costoTotalMateriales * 3;

        const inputCosto = document.getElementById('artesania-precio-costo');
        const inputVenta = document.getElementById('artesania-precio'); // MODIFICADO: Asegurar ID correcto de venta

        if (inputCosto) {
            inputCosto.placeholder = `Sugerido: $${costoTotalMateriales.toFixed(2)}`;
            inputCosto.dataset.sugerido = costoTotalMateriales.toFixed(2); 
        }
        
        if (inputVenta) {
            inputVenta.placeholder = `Sugerido (x3): $${ventaSugerida.toFixed(2)}`;
            inputVenta.dataset.sugerido = ventaSugerida.toFixed(2);
        }
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
        calcularPreciosSugeridos();
    };

    // --- 6. GUARDAR NUEVO PRODUCTO ---
    document.getElementById('form-nueva-artesania').onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('artesania-nombre').value;
        const unidad = document.getElementById('artesania-unidad').value;
        const stockAAgregar = parseInt(document.getElementById('artesania-cantidad').value);
        const inputCosto = document.getElementById('artesania-precio-costo');
        const inputVenta = document.getElementById('artesania-precio');
        const precioCosto = parseFloat(inputCosto.value) || parseFloat(inputCosto.dataset.sugerido) || 0;
        const precioVenta = parseFloat(inputVenta.value) || parseFloat(inputVenta.dataset.sugerido) || 0;

        // ==========================================
        // 1. EL CADENERO: Validar stock ANTES de insertar
        // ==========================================
        for (const item of materialesParaArtesania) {
            const matOriginal = listaMaterialesBD.find(m => m.id_material == item.id);
            
            if (!matOriginal) {
                return alert(`Error: El material ${item.nombre} no se encontró en la base de datos.`);
            }

            const totalNecesario = item.cant * stockAAgregar; 
            
            if (matOriginal.stock < totalNecesario) {
                
                return alert( `No hay suficiente ${item.nombre}. Tienes ${matOriginal.stock} y necesitas ${totalNecesario} para fabricar esto.`);
            }
        }

        // ==========================================
        // 2. SI PASA LA PRUEBA, AHORA SÍ GUARDAMOS TODO
        // ==========================================
        try {
            // Guardamos la artesanía
            console.log("Materiales que se van a guardar en la receta:", materialesParaArtesania)
            const { data: productoNuevo, error: errP } = await supabaseClient
                .from('producto')
                .insert([{ nombre: nombre, 
                    unidad: unidad, 
                    costo_producto: precioCosto, 
                    precio: precioVenta,       
                    stock: stockAAgregar }])
                .select()
                .single();
            if (errP) throw errP;

            // 2. Descontamos materiales Y GUARDAMOS LA RECETA
            for (const item of materialesParaArtesania) {
                const matOriginal = listaMaterialesBD.find(m => m.id_material == item.id);
                const nuevoStockMat = matOriginal.stock - (item.cant * stockAAgregar);
                
                // A) Descontamos el material
                await supabaseClient
                    .from('material')
                    .update({ stock: nuevoStockMat })
                    .eq('id_material', item.id);

                // B) NUEVO: Guardamos la receta en tu tabla intermedia
                await supabaseClient
                    .from('producto_material')
                    
                    .insert([{ 
                        id_producto: productoNuevo.id_producto, 
                        id_material: item.id, 
                        cantidad_necesaria: item.cant // Lo que gasta 1 sola pieza
                    }]);
            }
            alert("¡Artesanía guardada y materiales descontados correctamente!");
            location.reload();
        } catch (err) {
            alert("Error al guardar: " + err.message);
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
            document.getElementById('edit-precio-venta').value = producto.precio || '';
            document.getElementById('edit-precio-costo').value = producto.costo_producto || '';
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
        const stockNuevo = parseInt(document.getElementById('edit-stock').value);
        const nuevoCosto = parseFloat(document.getElementById('edit-precio-costo').value);
        const nuevoVenta = parseFloat(document.getElementById('edit-precio-venta').value);

        try {
            // 1. Obtenemos el stock que tiene actualmente en la BD
            const { data: prodViejo } = await supabaseClient
                .from('producto')
                .select('*')
                .eq('id_producto', productoEditandoId)
                .single();
            
            const diferenciaStock = stockNuevo - prodViejo.stock;

            // 2. VALIDACIÓN DE MATERIALES (Solo si está aumentando el stock)
            if (diferenciaStock > 0) {
                // Traemos la receta de la tabla intermedia
                const { data: receta } = await supabaseClient
                    .from('producto_material')
                    .select('*')
                    .eq('id_producto', productoEditandoId);

                if (receta && receta.length > 0) {
                    // --- EL CADENERO DE LA EDICIÓN ---
                    for (const ingrediente of receta) {
                        const { data: matActual } = await supabaseClient
                            .from('material')
                            .select('nombre, stock')
                            .eq('id_material', ingrediente.id_material)
                            .single();

                        const materialNecesarioExtra = ingrediente.cantidad_necesaria * diferenciaStock;

                        // Si lo que necesita es más de lo que hay en bodega... ¡ALERTA!
                        if (matActual.stock < materialNecesarioExtra) {
                            return alert(`¡No se puede, apa! Para aumentar el stock necesitas ${materialNecesarioExtra} de ${matActual.nombre}, pero solo te quedan ${matActual.stock} en el inventario.`);
                        }
                    }

                    // --- SI PASÓ LA VALIDACIÓN, DESCONTAMOS ---
                    for (const ingrediente of receta) {
                        const { data: matActual } = await supabaseClient
                            .from('material')
                            .select('stock')
                            .eq('id_material', ingrediente.id_material)
                            .single();

                        const materialGastadoExtra = ingrediente.cantidad_ncesaria * diferenciaStock;
                        const stockMatCorregido = matActual.stock - materialGastadoExtra;

                        await supabaseClient
                            .from('material')
                            .update({ stock: stockMatCorregido })
                            .eq('id_material', ingrediente.id_material);
                    }
                }
            }

            // 3. ACTUALIZACIÓN FINAL DE LA ARTESANÍA
            const { error } = await supabaseClient
                .from('producto')
                .update({ nombre, unidad, costo_producto: nuevoCosto, precio: nuevoVenta, stock: stockNuevo })
                .eq('id_producto', productoEditandoId); 

            if (error) throw error;
            
            alert('¡Producto actualizado y materiales descontados correctamente!');
            location.reload();

        } catch (err) {
            alert("Error al actualizar: " + err.message);
            console.error(err);
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
    const inputBuscador = document.querySelector('.barra-busqueda input'); 

    if (inputBuscador) {
    
        inputBuscador.addEventListener('keyup', (e) => {
            const textoBusqueda = e.target.value.toLowerCase();
    
            const filas = document.querySelectorAll('#tabla-producto-body tr');

            filas.forEach(fila => {
    
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
    async function cargarMaterialesDatalist() {
    try {
        const { data, error } = await supabaseClient
            .from('material')
            .select('id_material, nombre, stock, costo_unitario');
            
        if (error) throw error;
        
        listaMaterialesBD = data; 
        const datalist = document.getElementById('lista-materiales');
        
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
    iniciarEncabezado();
    cargarProductos();
    cargarMaterialesDatalist();
    calcularPreciosSugeridos();
    
});

