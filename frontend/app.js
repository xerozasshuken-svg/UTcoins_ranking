const API_URL = 'http://localhost:3000/api/auth';


//Logica de registro de estudiantes
const registerForm = document.getElementById('register-form');

if(registerForm){
    registerForm.addEventListener('submit', async (e) =>{
        e.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const carrera = document.getElementById('carrera').value;
        const matricula = document.getElementById('matricula').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;


        try{
            const respuesta = await fetch(`${API_URL}/register`,{
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    nombre,
                    carrera,
                    matricula: parseInt(matricula),
                    email,
                    password
                })
            });

            const datos = await respuesta.json();

            if(respuesta.ok){
                alert('Registro exitoso');
                window.location.href ='inicio_sesion.html';
            }
            else{
                alert(datos.mensaje || 'Hubo un error en el registro');
            }        
        }
        catch (error){
            console.error('Error',error);
            alert('No se pudo conectar con el servidor');
        }

    });
}

//Logica de incio de sesion
const loginForm = document.getElementById('login-form');

if(loginForm){
    loginForm.addEventListener('submit', async(e) =>{
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try{
            const respuesta = await fetch(`${API_URL}/login`,{
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, password})
            });
            

            const datos = await respuesta.json();

            if (respuesta.ok) {
                //Guardamos el token JWT en los datos del usuario
                localStorage.setItem('utcoins_token', datos.token)
                localStorage.setItem('utcoins_user', JSON.stringify(datos.estudiante));

                alert(`Bienvenido de nuevo ${datos.estudiante.nombre}`)
                
                //Direccionamiento hacia index
                window.location.href = 'index.html';
            }
            else{
                alert(datos.mensaje || 'Credenciales incorrectas');
            }
        }
        catch (error){
            console.error('Error: ', error);
            alert('Error al conectar con el servidor');
        }
    });
}

//Revisamos el token en el navegador
const token = localStorage.getItem('utcoins_token');
const usuarioData = localStorage.getItem('utcoins_user');

const navLinks = document.querySelectorAll('.nav-item');
const btnCuenta = document.querySelector('.btn-cuenta');
const btnComenzar = document.querySelector('.btn-start');

if(navLinks.length >0){
    //CONFIGURACION SI EL USUARIO YA ESTA LOGUEADO
    if (token && usuarioData) {
        const usuario = JSON.parse(usuarioData);

        //Cambio del texto en el boton "cuenta"
        if (btnCuenta) {
            btnCuenta.textContent = `Cuenta; ${usuario.nombre.split(' ')[0]}`;
            btnCuenta.href = 'info_cuenta.html';
        }
        if (btnComenzar) {
            btnComenzar.textContent = 'Ir a actividades';
            btnComenzar.href = 'actividades.html';
        }
    }    
    else{
        // Si NO está logueado, protegemos las secciones del menú
        navLinks.forEach(enlace =>{
            enlace.addEventListener('click', (e) =>{
                const texto = enlace.textContent.trim();
                if(texto.includes('Actividades') || texto.includes('Tabla')){
                    e.preventDefault();
                    window.location.href = 'inicio_sesion.html';
                }
            });
        });
        
        if(btnComenzar){
            btnComenzar.textContent = "Comenzar Ahora";
            btnComenzar.href = 'registrarse.html';
        }
    }
}


const infoCarrera = document.getElementById('info-carrera');

if(infoCarrera){
    if (!token || !usuarioData) {
        window.location.href = 'inicio_sesion.html';
    }
     else {
        const usuario = JSON.parse(usuarioData);

        const subTitulo = document.querySelector('.subtitle');
        if (subTitulo) {
            subTitulo.textContent = `Estudiante: ${usuario.nombre}`;
        }

        // Inyectamos los datos asegurando minúsculas en las propiedades del objeto
        infoCarrera.textContent = usuario.carrera;
        document.getElementById('info-matricula').textContent = usuario.matricula;
        document.getElementById('info-email').textContent = usuario.email;
        }

        //boton cerrar sesion
        const btnLogout = document.getElementById('btn-logout');

    if (btnLogout) {
        btnLogout.addEventListener('click', () =>{
            localStorage.removeItem('utcoins_token');
            localStorage.removeItem('utcoins_user');
            alert('Sesion cerrada correctamente');
            window.location.href = 'index.html';
        });
    }
}
