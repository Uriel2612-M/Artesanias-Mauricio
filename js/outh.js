// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('login-form'); // Asegúrate que tu <form> en index.html tenga este ID
    const btnLogin = document.getElementById('btn-login'); // Y tu botón este ID

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página parpadee y se recargue
            
            // 1. Sacamos lo que el usuario escribió
            // Ojo: Asegúrate que los IDs coincidan con tus <input> del HTML
            const inputUsuario = document.getElementById('login-usuario').value;
            const inputPassword = document.getElementById('login-password').value;

            if (inputUsuario === '' || inputPassword === '') {
                alert('Por favor, llena todos los campos, apa.');
                return;
            }

            btnLogin.textContent = 'Verificando en BD...';

            try {
                // 2. Vamos a Supabase a buscar coincidencias en tu tabla 'usuario'
                const { data: usuarioBD, error } = await supabaseClient
                    .from('usuario') 
                    .select('*')
                    .eq('nombre_usuario', inputUsuario) 
                    .eq('password', inputPassword) 
                    .single(); // Esperamos que solo haya 1 usuario con esos datos

                // 3. Si hay error o no encontró a nadie...
                if (error || !usuarioBD) {
                    alert('Usuario o contraseña incorrectos. Intenta de nuevo.');
                    btnLogin.textContent = 'Iniciar Sesión';
                    return;
                }

                // 4. ¡ÉXITO! Si llegamos aquí, las credenciales son válidas.
                alert(`¡Bienvenido al sistema, ${usuarioBD.nombre_usuario}!`);
                
                // Guardamos el ROL y el NOMBRE en la "memoria" del navegador
                localStorage.setItem('rolUsuario', usuarioBD.id_rol);
                localStorage.setItem('nombreUsuario', usuarioBD.nombre_usuario);
                
                // Lo aventamos directo al Dashboard
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
        // 1. Ocultamos los botones sueltos
        const elementosProhibidos = document.querySelectorAll('.solo-admin');
        elementosProhibidos.forEach(elemento => {
            elemento.style.display = 'none';
        });

        // 2. Si intenta entrar a la brava a una página prohibida, lo pateamos al inicio
        if (paginaActual.includes('compras.html') || 
            paginaActual.includes('proveedores.html')) {
            alert("¡Acceso denegado! Área exclusiva de administración.");
            window.location.href = 'dashboard.html'; 
        }
    }
});