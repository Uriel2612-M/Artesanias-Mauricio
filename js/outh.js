document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. LÓGICA DE LOGIN (Solo aplica si existe el formulario)
    // ==========================================
    const formLogin = document.getElementById('login-form'); 
    const btnLogin = document.getElementById('btn-login'); 

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); 
                
            const inputUsuario = document.getElementById('login-usuario').value;
            const inputPassword = document.getElementById('login-password').value;

            if (inputUsuario === '' || inputPassword === '') {
                alert('Por favor, llena todos los campos.');
                return;
            }

            btnLogin.textContent = 'Verificando en BD...';

            try {
                const { data: usuarioBD, error } = await supabaseClient
                    .from('usuario') 
                    .select('*')
                    .eq('nombre_usuario', inputUsuario) 
                    .eq('password', inputPassword) 
                    .single(); 

                if (error || !usuarioBD) {
                    alert('Usuario o contraseña incorrectos. Intenta de nuevo.');
                    btnLogin.textContent = 'Iniciar Sesión';
                    return;
                }

                // --- CORRECCIÓN CRÍTICA AQUÍ ---
                // Agregamos el ID del usuario para que las compras y ventas no truenen
                localStorage.setItem('idUsuario', usuarioBD.id_usuario); // Asegúrate de que tu columna se llame id_usuario en Supabase
                localStorage.setItem('rolUsuario', usuarioBD.id_rol);
                localStorage.setItem('nombreUsuario', usuarioBD.nombre_usuario);
                
                window.location.href = 'dashboard.html'; 

            } catch (err) {
                console.error('Error al conectar con Supabase:', err);
                alert('Hubo un error de conexión con la base de datos.');
                btnLogin.textContent = 'Iniciar Sesión';
            }
        });
    }

    // ==========================================
    // 2. LÓGICA DE SEGURIDAD (Protección de rutas y botones)
    // ==========================================
    const rolActual = localStorage.getItem('rolUsuario');
    
    // Si la variable existe (es decir, alguien inició sesión), aplicamos reglas
    if (rolActual) {
        const idRolLimpio = String(rolActual).trim(); // Le quitamos espacios fantasma
        const paginaActual = window.location.pathname;
        
        console.log("El ID del rol que entró es el:", idRolLimpio);

        // Si NO es Administrador (Rol 1)
        if (idRolLimpio !== '1') { 
            
            // A) Esconder botones
            const elementosProhibidos = document.querySelectorAll('.solo-admin');
            elementosProhibidos.forEach(elemento => {
                elemento.style.display = 'none';
            });

            // B) Expulsar de páginas prohibidas
            if (paginaActual.includes('compras.html') || paginaActual.includes('proveedores.html')) {
                alert("¡Acceso denegado! Área exclusiva de administración.");
                window.location.href = 'dashboard.html'; 
            }
        }
    }
});