document.addEventListener('DOMContentLoaded', ()=>{
    //Obtener el token
    const token = localStorage.getItem('utcoins_token') || localStorage.getItem('token');

    const rolUsuario = (localStorage.getItem('rol') || '').toLowerCase().trim();
    console.log("El rol detectado en LocalStorage es:", rolUsuario);
    

    if (!token) {
        window.location.href = 'inicio_sesion.html';
        return;
    }

    //URL BASE del backend
    const API_URL = 'http://localhost:3000/api/actividades';

    
    let esAdmin = false;
    let vistaActual = 'global';

    const btnAdminCrear = document.getElementById('btn-abrir-modal-actividad');
    const btnMisActividades = document.getElementById('btn-mis-actividades');
    const btnVerDisponibles = document.getElementById('btn-ver-disponibles');
    const folderCuerpo = document.getElementById('folder-cuerpo');
    const pestanasContainer = document.querySelector('.folder-pestanas'); // Asegúrate de tener este contenedor o ajusta según tu HTML
    const pestanas = document.querySelectorAll('.btn-categoria');

    //Activacion de bootones segun el rol
    if (rolUsuario === 'admin') {
        esAdmin = true;

        //Mensaje de prueba
        console.log("Datos del usuario en sesion:", usuario);
        console.log("El rol detectado es: ", usuario.rol);

            if (btnAdminCrear) {
                btnAdminCrear.style.display = 'inline-block';
            }
            if (btnMisActividades) {
                btnMisActividades.style.display = 'none';
            }
            if (btnVerDisponibles) {
                btnVerDisponibles.style.display = 'none';
            }
    }
    else{
        esAdmin = false;
            if (btnAdminCrear) {
                btnAdminCrear.style.display = 'none';
            }
            if (btnMisActividades) {
                btnMisActividades.style.display = 'inline-block';
            }
            if (btnVerDisponibles) {
                btnVerDisponibles.style.display = 'none';
            }
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
            btnVerDisponibles.style.display = 'block';

            if (pestanasContainer) pestanasContainer.style.display = 'none';
            cargarActividades();
        });

        btnVerDisponibles.addEventListener('click', ()=>{
            vistaActual = 'global';
            btnVerDisponibles.style.display = 'none';
            btnMisActividades.style.display = 'block';
            if(pestanasContainer) pestanasContainer.style.display = 'flex';

            //Volver a cargar la categoria que este activa
            const pestanaActiva = document.querySelector('.btn-categorias.activo') || pestanas[0];
            cargarActividades(pestanaActiva.getAttribute('data-categoria'));
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
    cargarActividades('academias');

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
                    botonesAccion = `<button class="btn-eliminar-actividad" data-id="${act.id}">Eliminar</button>`;
                }
                else if (vistaActual === 'global') {
                    //Vista Estudiante Catalogo
                    botonesAccion = `<button class="btn-inscribir btn-qr" data-id="${act.id}">Registrarse</button>`;
                }
                else if (vistaActual === 'mis_actividades') {
                    //Vista Estudiante 
                    botonesAccion = `
                        <button class="btn-verificar" data-id="${act.id}" ${act.codigo_verificado ? 'disabled style="background-color:#777;"' : ''}>
                            ${act.codigo_verificado ? 'Verificado ✓' : 'Verificar Código'}
                        </button>
                        <button class="btn-escanear-cam" data-id="${act.id}" ${act.qr_escaneado ? 'disabled style="background-color:#777;"' : ''}>
                            ${act.qr_escaneado ? 'Cobrado $$' : 'Escanear QR'}
                        </button>
                        <button class="btn-baja" data-id="${act.id}" style="background-color:#d9534f;">Dar de baja</button>
                    `;
                }

                tarjeta.innerHTML = `
                <div class="actividad-info">
                    <h3>${act.titulo}</h3>
                    <p>${act.descripcion}</p>
                    <span class="recompensa">${act.puntos || act.utcoins_recompensa || 0} UTCOINS</span>
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
                    const res = await fetch(`${API_URL}/eliminar/${act.id}`,{
                        method: 'DELETE',
                        headers: {'Authorization': `Bearer ${token}`}
                    });
                    if(res.ok) {tarjeta.remove();}
                }
                catch (e){
                    console.error(e);
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
            btnBaja.addEventListener('click', async()=>{
                if (!confirm(`¿Seguro que deseas darte de baja de "${act.titulo}"?`)) return;
                try{
                    const res = await fetch(`${API_URL}/baja/${act.id}`,{
                        method: 'DELETE',
                        headers: {'Authorizaton': `Bearer ${token}`}
                    });
                    const data = await res.json();
                    alert(data.mensaje);
                    if(res.ok) tarjeta.remove();
                }
                catch (e){
                    console.error(e);
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
                        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                        body: JSON.stringify({actividadId: act.id, codigoTexto: codigo.trim()})
                    });
                    const data = await res.json();
                    alert(data.mensaje);
                    if(res.ok) cargarActividades(); //Refrescar para deshabilitar boton
                }
                catch (e){
                    console.error(e);
                }
            });
        }
        //Evento escanear QR (estudiante)
        const btnEscanearQr = tarjeta.querySelector('.btn-escanear-cam');
        if (btnEscanearQr) {
            btnEscanearQr.addEventListener('click', ()=>{
                alert("Abtiendo camara... (aqui se integrara la libreria de la camara)");
                //Prueba de logica
                const qrSimulando = prompt("[PRUEBA CONTROLLER] Acerca el QR a la camara (escribe el codigo del qr aqui): ");
                if(!qrSimulando) return;

                enviarLecturaQR(act.id, qrSimulando.trim());
            });
        }
    }

    //Funcion auxiliar para enviar el QR
    async function enviarLecturaQR(actividadId, contenidoQR) {
        try{
            const res = await fetch(`${API_URL}/escanear-qr`,{
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({actividadId, contenidoQR})
            });
            const data = await res.json();
            alert(data.mensaje);
            if(res.ok) cargarActividades();
        }
        catch (e){
            console.error(e);
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