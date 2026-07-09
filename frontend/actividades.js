document.addEventListener('DOMContentLoaded', ()=>{
    //Verificar la seguridad bloqueo sin sesion
    const token = localStorage.getItem('utcoins_token');
    const usuarioData = localStorage.getItem('utcoins_user');

    if (!token) {
        window.location.href = 'inicio_sesion.html';
        return;
    }

    //URL BASE del backend
    const API_URL = 'http://localhost:3000/api/actividades';

    //Deteccion del rol admin
    let esAdmin = false;
    if (usuarioData) {
        const usuario = JSON.parse(usuarioData);

        //Mensaje de prueba
        console.log("Datos del usuario en sesion:", usuario);
        console.log("El rol detectado es: ", usuario.rol);
        
        if (usuario.rol === 'admin') {
            esAdmin = true;
            const btnAdminCrear = document.getElementById('btn-abrir-modal-actividad');
            
            //encender el boton de crear
            if (btnAdminCrear) {
                console.log("Boton cambiado display a block");
                btnAdminCrear.style.display = 'block';
            }
            else{
                console.log("ERROR: No se encontró el ID 'btn-abrir-modal-actividad' en el HTML.");
            }
        }
        else{
            console.log("No se mostró el botón porque el rol NO es exactamente 'admin'.");
        }
    }

    const modal = document.getElementById('modal-actividad');
    const btnAbrirModal = document.getElementById('btn-abrir-modal-actividad');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');

    //comprobar si estan activos y mostrar o ocuitar
    if (btnAbrirModal && modal && btnCerrarModal) {
            btnAbrirModal.addEventListener('click', () => modal.classList.add('mostrar')); // <-- Ahora con punto (.)
            btnCerrarModal.addEventListener('click', () => modal.classList.remove('mostrar'));
    }
    
    //Capturar las pestanas y el cuerpo del folder
    const pestanas = document.querySelectorAll('.btn-categoria');
    const folderCuerpo = document.getElementById('folder-cuerpo');

    //Cargar la categoria por defecto al entrar
    cargarActividades('academicas');

    //Evento de clic por pestana
    pestanas.forEach(pestana =>{
        pestana.addEventListener('click', (e) =>{

            //Buscar el elemento de la pestana anterior
            const pestanaActiva = document.querySelector('.btn-categoria.activo');
            if (pestanaActiva) {
                pestanaActiva.classList.remove('activo');
            }

            //Añadir la clase a la pestaña seleccionada
            e.target.classList.add('activo');

            //Obtener la categoria que se presiono
            const categoriaSeleccionada = e.target.getAttribute('data-categoria');

            //LLamar la funcion de las actividades ded la BD
            cargarActividades(categoriaSeleccionada);
        });
    });
    
    //Funcion para traer las actividades de la DB
    async function cargarActividades(categoria) {
        folderCuerpo.innerHTML = `
        <div class="cargando">
            <p>Cargando actividades de <strong>${categoria}</strong>...</p>
        </div>
        `;

        try{
            const respuesta = await fetch(`${API_URL}?categoria=${categoria}`,{
                headers: {'Authorization': `Bearer ${token}`}
            });
            const actividades = await respuesta.json();

             folderCuerpo.innerHTML = ''; //Elimina el cargando...

            if (actividades.length === 0) {
                folderCuerpo.innerHTML =  `<p class="no-datos">No hay actividades disponibles en esta categoria por el momento.</p>`;
                return;
            }

            //Dibujar cada tarjeta en el HTML
            actividades.forEach(act =>{
                const tarjeta = document.createElement('div');
                tarjeta.classList.add(`tarjeta-actividad`);

                //Si es admin se agrega un boton para eliminar
                let botonesAdmin = '';
                if (esAdmin) {
                  botonesAdmin = `<button class="btn-eliminar-actividad" data-id="${act.id}">Eliminar</button>`;   
                }

                tarjeta.innerHTML = `
                <div class="actividad-info">
                    <h3>${act.titulo}</h3>
                    <p>${act.descripcion}</p>
                    <span calss="recompensa">${act.puntos} UTCOINS</span>
                </div>
                <div class="actividad-acciones">
                    <button class="btn-qr" data-id="${act.id}">Escanear QR</button>
                    ${botonesAdmin}
                </div>
                `;
                folderCuerpo.appendChild(tarjeta);

                //Escucahr el boton de eliminar si es admin y existe
                if (esAdmin) {
                    const btnEliminar = tarjeta.querySelector('.btn-eliminar-actividad');
                    if (btnEliminar) {
                    
                        btnEliminar.addEventListener('click', async ()=>{
                        
                            //Confirmacion de seguridad
                            const confirmar = confirm(`¿Estas seguro de eliminar la actividad "${act.titulo}"?`);
                            if (!confirmar) return;

                            try{
                                //Peticion DELETE a la DB usando el ID dinamico
                                const respuesta = await fetch(`http://localhost:3000/api/actividades/eliminar/${act.id}`,{
                                    method:'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                });

                                const datos = await respuesta.json();

                                if (respuesta.ok) {
                                    alert('Actividad elimnada con exito');
                                    //Remover la tarjeta visualmente
                                    tarjeta.remove();

                                    //Si el folder se queda vacio tras borrarla, muestr el aviso
                                    if (folderCuerpo.children.length === 0) {
                                        folderCuerpo.innerHTML = `<p class="no-datos">NO hay actividades disponibles en esta categoria por el momento </p>`;   
                                    }
                                }
                                else{
                                    //Atrapar el error 404 si la DB bloquea la eliminacion
                                    alert(`Error: ${datos.mensaje}`);
                                }
                            }
                            catch (error){
                                console.error("Error al eliminar la actividad: ", error);
                                alert(`Hubo un error al conectar con el servidor`);
                            }
                        });
                    }
                }
            });
        }
        catch (error){
            console.error("Error al cargar actividades: ",error);
            folderCuerpo.innerHTML = `<p class="error">Hubo un error al conectar con el servidor</p>`;
        }
    }   

    //Enviar el formualrio (guardar en DB)
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
                    alert(`Error: ${datosError.mensaje || 'Noi se pudo guardar'}`);
                }
            }   
            catch (error){
                console.error("Error al guardar la actividad: ", error);
                alert('Error al conectar con el servidor');
            }
        });
    }

});