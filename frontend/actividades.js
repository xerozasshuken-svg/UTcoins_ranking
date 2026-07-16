document.addEventListener('DOMContentLoaded', ()=>{
    //Obtener el token
    const token = localStorage.getItem('utcoins_token') || localStorage.getItem('token');

    const usuarioString = localStorage.getItem('utcoins_user');
    let rolUsuario = '';

    if (usuarioString) {
        try {
            const usuarioObjeto = JSON.parse(usuarioString);
            rolUsuario = usuarioObjeto.rol || '';
        } catch (e) {
            console.error("Error al parsear utcoins_user", e);
        }
    }
    rolUsuario = rolUsuario.toLowerCase().trim();
    console.log("El rol detectado en localstorage es: ", `"${rolUsuario}"`);
    

    if (!token) {
        window.location.href = 'inicio_sesion.html';
        return;
    }

    //URL BASE del backend
    const API_URL = 'http://Tu ip:3000/api/actividades';

    
    let esAdmin = false;
    let vistaActual = 'global';

    const btnAdminCrear = document.getElementById('btn-abrir-modal-actividad');
    const btnMisActividades = document.getElementById('btn-mis-actividades');
    const btnVerDisponibles = document.getElementById('btn-ver-disponibles');
    const folderCuerpo = document.getElementById('folder-cuerpo');
    const pestanasContainer = document.querySelector('.folder-pestanas'); // Asegúrate de tener este contenedor o ajusta según tu HTML
    const pestanas = document.querySelectorAll('.btn-categoria');

    const modalQR = document.getElementById('modal-qr');
    const btnCerrarQR = document.getElementById('btn-cerrar-modal-qr');
    let html5QrScanner = null; //instancia de la camara

    //Activacion de bootones segun el rol
    if (rolUsuario === 'admin') {
        esAdmin = true;

        //Mensaje de prueba
        console.log("El usuario es administrador");

        if (btnAdminCrear) btnAdminCrear.style.display = 'inline-block';
        if (btnMisActividades) btnMisActividades.style.display = 'none';
        if (btnVerDisponibles) btnVerDisponibles.style.display = 'none';
    }
    else{
        esAdmin = false;
        console.log("El usuario es estudiante");
        if (btnAdminCrear) btnAdminCrear.style.display = 'none';
        if (btnMisActividades) btnMisActividades.style.display = 'inline-block';
        if (btnVerDisponibles) btnVerDisponibles.style.display = 'none';
    }

    //Modal crear actividad
    const modal = document.getElementById('modal-actividad');

    if (btnAdminCrear && modal) {
            btnAdminCrear.addEventListener('click', () => modal.classList.add('mostrar')); // <-- Ahora con punto (.)
            document.getElementById('btn-cerrar-modal').addEventListener('click', ()=> modal.classList.remove('mostrar'));
    }
    //Interruptores de vista
    if (btnMisActividades && btnVerDisponibles) {
        btnMisActividades.addEventListener('click', ()=>{
            vistaActual = 'mis_actividades';
            btnMisActividades.style.display = 'none';
            btnVerDisponibles.style.display = 'inline-block';

            if (pestanasContainer) pestanasContainer.style.display = 'none';
            cargarActividades('');
        });

        btnVerDisponibles.addEventListener('click', ()=>{
            vistaActual = 'global';
            btnVerDisponibles.style.display = 'none';
            btnMisActividades.style.display = 'inline-block';
            if(pestanasContainer) pestanasContainer.style.display = 'flex';

            // Recupera la pestaña que tiene tu clase real "activo"
            const pestanaActiva = document.querySelector('.btn-categorias.activo') || pestanas[0];
            cargarActividades(pestanaActiva.getAttribute('data-categoria'));
        });
    }

    if (btnCerrarQR) {
        btnCerrarQR.addEventListener('click', ()=>{
            modalQR.classList.remove('mostrar');

            if (html5QrScanner) {
                html5QrScanner.clear().catch(err => console.error("Error al apagar camara: ",err));
            }
        });
    }

    //Manejo de clicks en pestanas
    pestanas.forEach(pestana =>{
        pestana.addEventListener('click', (e) =>{

            //Buscar el elemento de la pestana anterior
            const pestanaActiva = document.querySelector('.btn-categoria.activo');
            if (pestanaActiva) {
                pestanaActiva.classList.remove('activo');
            }

            //Añadir la clase a la pestaña seleccionada
            e.target.classList.add('activo');

            if (vistaActual === 'global') {
                cargarActividades(e.target.getAttribute('data-categoria')); 
            }
        });
    });
    //Carga inicial por defecto
    cargarActividades('academicas');

    //Funcion principal Renderizadora
    async function cargarActividades(categoria = '') {
        folderCuerpo.innerHTML = `
        <div class="cargando">
            <p>Cargando actividades de <strong>${categoria}</strong>...</p>
        </div>
        `;

        let urlTarget = `${API_URL}?categoria=${categoria}`;
        if (vistaActual === 'mis_actividades') {
            urlTarget = `${API_URL}/mis-actividades`;
        }

        try{
            const respuesta = await fetch(urlTarget, {
                headers: {'Authorization': `Bearer ${token}`}
            });

            //En caso de que el servidor responda con ERROR 403 o demas
            if (!respuesta.ok) {
                const datosError = await respuesta.json();
                folderCuerpo.innerHTML = `<p class="error">Error del servidor: ${datosError.mensaje || 'Acceso denegado'}</p>`;
                return;
            }
            const actividades = await respuesta.json();

             folderCuerpo.innerHTML = ''; //Elimina el cargando...

            if (!actividades || actividades.length === 0) {
                folderCuerpo.innerHTML =  `<p class="no-datos">No hay actividades disponibles en esta categoria por el momento.</p>`;
                return;
            }

            //Dibujar cada tarjeta en el HTML
            actividades.forEach(act =>{
                const tarjeta = document.createElement('div');
                tarjeta.classList.add(`tarjeta-actividad`);

                //Renderizado condicional botones entre rol y vista activa
                let botonesAccion = '';
                
                if (esAdmin) {
                    //Vista Admin: Solo puede eliminar permanente
                    botonesAccion = `<button class="btn-eliminar-actividad" data-id="${act.id}" style="background-color: #d9534f; color: white;">Eliminar</button>`;
                }
                else{  
                    if (vistaActual === 'global') {
                    //Vista Estudiante Catalogo
                          botonesAccion = `<button class="btn-inscribir btn-qr" data-id="${act.id}">Registrarse</button>`;
                    }
                    else if (vistaActual === 'mis_actividades') {
                        //Vista Estudiante 
                        botonesAccion = `
                            <button class="btn-verificar btn-qr" data-id="${act.id}" ${act.cdigo_verificado ? 'disabled style="background-color:#777;"' : 'style="background-color:#28a745; color:white;"'}>
                                ${act.codigo_verificado ? 'Verificado ✓' : 'Verificar Código'}
                            </button>
                            <button class="btn-escanear-cam btn-qr" data-id="${act.id}" ${act.qr_escaneado ? 'disabled style="background-color:#777;"' : 'style="background-color:#007bff; color:white;"'}>
                                ${act.qr_escaneado ? 'Cobrado' : 'Escanear QR'}
                            </button>
                            <button class="btn-baja btn-qr" data-id="${act.id}" style="background-color:#d9534f; color:white;">Dar de baja</button>
                        `;
                    }
                }
                
                //Inyeccion exacta en la estructura de tarjeta eal
                tarjeta.className = 'tarjeta-actividad';
                tarjeta.innerHTML = `
                    <div class="actividad-info">
                        <h3>${act.titulo}</h3>
                        <p>${act.descripcion}</p>
                        <span class="recompensa">${act.puntos} UTCOINS</span>
                    </div>
                    <div class="actividad-acciones">
                        ${botonesAccion}
                    </div>
                `;  

                //Asignacion de eventos Dinamicos a cada Tarjeta
                asignarEventosTarjeta(tarjeta, act);

                folderCuerpo.appendChild(tarjeta);
            });
        }
        catch (error){
            console.error("Error al cargar actividades: ",error);
            folderCuerpo.innerHTML = `<p class="error">Hubo un error al conectar con el servidor</p>`;
        }
    }
    
    //Funcion asignar eventos
    function asignarEventosTarjeta(tarjeta, act){
        //Evento eliminar (admin)
        const btnEliminar = tarjeta.querySelector('.btn-eliminar-actividad');
        if (btnEliminar) {
            btnEliminar.addEventListener('click', async ()=>{
                if(!confirm(`¿Eliminar permanente "${act.titulo}"?`)) return;
                try{
                    const respuesta = await fetch(`${API_URL}/eliminar/${act.id}`,{
                        method: 'DELETE',
                        headers: {'Authorization': `Bearer ${token}`}
                    });
                    
                    const datos = await respuesta.json();

                    if (respuesta.ok) {
                        alert(datos.mensaje || 'Actividad eliminada con exito');
                        //Recargar la categoria actual para que la tarjeta desaparezca
                        const pestanaActiva = document.querySelector('.btn-categoria.activo');
                        cargarActividades(pestanaActiva ? pestanaActiva.getAttribute('data-categoria'): 'academicas');
                    }
                    else{
                        alert(`Error: ${datos.mensaje || 'No se puede eliminar la actividad'}`);
                    }
                }
                catch (error){
                    console.error('Error al conectar con el servidor al eliminar: ',error);
                    alert('Error al conectar con el servior');
                }
            });
        }

        //Registrarse (Estudiante)
        const btnInscribir = tarjeta.querySelector('.btn-inscribir');
        if (btnInscribir) {
            btnInscribir.addEventListener('click', async ()=>{
                try{
                    const res = await fetch(`${API_URL}/inscribir`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                        body: JSON.stringify({ actividadId: act.id})
                    });
                    const data = await res.json();
                    alert(data.mensaje);
                }
                catch (e){
                    console.error(e);
                }
            });
        }

        //Evento dar de baja (estudiante)
        const btnBaja = tarjeta.querySelector('.btn-baja');
        if (btnBaja) {
            btnBaja.addEventListener('click', async () => {
                if (!confirm(`¿Seguro que deseas darte de baja de "${act.titulo}"?`)) {
                    return;
                }
                
                const tokenActivo = localStorage.getItem('utcoins_token') || localStorage.getItem('token');

                if (!tokenActivo) {
                    alert('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
                    window.location.href = 'inicio_sesion.html';
                    return;
                }
                
                try{
                    const respuesta = await fetch(`http://localhost:3000/api/actividades/baja/${act.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            // Aseguramos el formato exacto "Bearer " que te pide tu authmiddleware
                            'Authorization': `Bearer ${tokenActivo}`
                        }
                    });

                    const datos = await respuesta.json();
                    
                    if (respuesta.ok) {
                        alert(datos.mensaje || 'Te has dado de baja correctamente');

                        //Volvemos a llamar a cargarActividades sin pasar categoría 
                        // para que el folder se vuelva a pintar desde el servidor y la tarjeta ya no aparezca
                        if (vistaActual === 'mis_actividades') {
                            cargarActividades('');    
                        }
                        else{
                            const pestanaActiva = document.querySelector('.btn-categoria.activo');
                            const cat = pestanaActiva ? pestanaActiva.getAttribute('data-categoria') : 'academicas';
                            cargarActividades(cat);
                        }
                    }
                    else{
                        alert(`Error: ${datos.mensaje || 'No se pudo dar de baja'}`);
                    }
                }
                catch (error){
                    console.error('Error al conectar con el servidor para dar de baja: ', error);
                    alert('Error al conectar con el servidor');
                }
            });
        }

        //Evento verificar codigo de texto (estudiante)
        const btnVerificar = tarjeta.querySelector('.btn-verificar');
        if (btnVerificar) {
            btnVerificar.addEventListener('click', async ()=>{
                const codigo = prompt("Ingresa el codigo unico proporcionado por el tutol/evento: ");
                if(!codigo) return;
            
                try{
                    const res = await fetch(`${API_URL}/verificar-codigo`,{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            actividadId: act.id, codigoTexto: codigo.trim()
                        })
                    });
                    const data = await res.json();
                    alert(data.mensaje);
                    if(res.ok) {cargarActividades('')}; //Refrescar para deshabilitar boton
                }
                catch (e){
                    console.error("Error al verificar codigo manual: ", e);
                    alert("Error al conectar con el servidor");
                }
            });
        }
        //Evento escanear QR (estudiante)
        const btnEscanearQr = tarjeta.querySelector('.btn-escanear-cam');
        if (btnEscanearQr) {
            btnEscanearQr.addEventListener('click', async ()=>{

                //Mostrar el modal en pantalla
                modalQR.classList.add('mostrar');

                //Inicializar el escaner en 'lector-qr-camara'
                html5QrScanner = new Html5Qrcode("lector-qr-camara");

                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                try {
                    
                    //encender directamente la camara trasera ('enviroment')
                    await html5QrScanner.start(
                        { facingMode: "environment" },
                        config,
                        async (decodedText) =>{
                            //callback cuando se lee el qr con exito
                            console.log(`Codigo detectado: ${decodedText}`);

                            //Detener la camara y cerrar el modal
                            await html5QrScanner.stop();
                            modalQR.classList.remove('mostrar');

                            await enviarLecturaQR(act.id, decodedText);
                        },
                        (errorMessage) =>{

                        }
                    );
                } 
                catch (error) {
                    console.error("Error al iniciar la camara: ", error);
                    alert("No se pudo acceder a la camara. Asegurate de otorgar los permisos en el navegador");
                    modalQR.classList.remove('mostrar');
                }
            });
        }
    }

    //Funcion auxiliar para enviar el QR
    async function enviarLecturaQR(actividadId, contenidoQR) {
        try{
            const res = await fetch(`${API_URL}/escanear-qr`,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    actividadId, contenidoQR
                })
            });
            const data = await res.json();
            alert(data.mensaje);
            if(res.ok) {cargarActividades('')};
        }
        catch (e){
            console.error("Error al enviar la lectura del QR:", e);
            alert("Error al conectar con el servidor");
        }
    }
    
    //Formulario crear actividad
    const formCrear = document.getElementById('form-crear-actividad');
    if (formCrear) {
        formCrear.addEventListener('submit', async (e) =>{
            e.preventDefault();

            const titulo = document.getElementById('act-titulo').value;
            const descripcion = document.getElementById('act-descripcion').value;
            const puntos = document.getElementById('act-puntos').value;
            const categoria = document.getElementById('act-categoria').value;
            const expiracionOpcion = document.getElementById('act-expiracion').value;

            //calcular la fecha de expiaracion real
            let fechaExpiracion = null;
            if (expiracionOpcion !== 'nunca') {
                const dias = parseInt(expiracionOpcion);
                const hoy = new Date();
                hoy.setDate(hoy.getDate() + dias);
                fechaExpiracion = hoy.toISOString();
            }

            const nuevaActividad = {
                titulo,
                descripcion,
                puntos,
                categoria,
                fecha_expiracion: fechaExpiracion
            };

            try{
                const respuesta = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(nuevaActividad)
                });

                if (respuesta.ok) {
                    alert('Actividad creada con exito');
                    formCrear.reset();
                    modal.classList.remove('mostrar'); //cerrar modal

                    //Refresacr el folder si coincide con la categoria correcta
                    const pestanaActiva = document.querySelector('.btn-categoria.activo');
                    if (pestanaActiva && pestanaActiva.getAttribute('data-categoria') === categoria) {
                        cargarActividades(categoria);
                    }
                }
                else{
                    const datosError = await respuesta.json();
                    alert(`Error: ${datosError.mensaje || 'No se pudo guardar'}`);
                }
            }   
            catch (error){
                console.error("Error al guardar la actividad: ", error);
                alert('Error al conectar con el servidor');
            }
        });
    }
});
