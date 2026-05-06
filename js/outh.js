// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
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
});
document.addEventListener('DOMContentLoaded', () => {
    const rolActual = localStorage.getItem('rolUsuario');

    console.log("El ID del rol que entró es el:", rolActual);
    if (rolActual !== '1') { 
        
        const elementosProhibidos = document.querySelectorAll('.solo-admin');
        
        elementosProhibidos.forEach(elemento => {
            elemento.style.display = 'none';
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const rolActual = localStorage.getItem('rolUsuario');
    const paginaActual = window.location.pathname;
    
    if (rolActual !== '1') { 
        
        const elementosProhibidos = document.querySelectorAll('.solo-admin');
        elementosProhibidos.forEach(elemento => {
            elemento.style.display = 'none';
        });

        if (paginaActual.includes('compras.html') || 
            paginaActual.includes('proveedores.html')) {
            alert("¡Acceso denegado! Área exclusiva de administración.");
            window.location.href = 'dashboard.html'; 
        }
    }
});