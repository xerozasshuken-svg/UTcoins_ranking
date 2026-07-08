
    document.addEventListener('DOMContentLoaded', ()=>{
    //Verificar la seguridad bloqueo sin sesion
    const token = localStorage.getItem('utcoins_token');
    const usuarioData = localStorage.getItem('utcoins_user');

    if (!token) {
        window.location.href = 'inicio_sesion.html';
        return;
    }

    //Deteccion del rol admin
    let esAdmin = false;
    if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        if (usuario.rol === 'admin') {
            esAdmin = true;
            const btnAdminCrear = document.getElementById('btn-abrir-modal-actividad');
            //encender el boton de crear
            if (btnAdminCrear) btnAdminCrear.style.display = 'block';
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

    //Evento de clic por pestana
    pestanas.forEach(pestana =>{
        pestana.addEventListener('click', (e) =>{

            //EBuscar el elemento de la pestana anterior
            const pestanaActiva = document.querySelector('.btn-categoria.activo');
            if (pestanaActiva) {
            pestanaActiva.classList.remove('activo');
            }

            //Añadir la calse a la pestaña seleccionada
            e.target.classList.add('activo');

            //Obtener la categoria que se presiono
            const categoriaSeleccionada = e.target.getAttribute('data-categoria');

            //Limpiar el contenedor y poner el mensaje
            folderCuerpo.innerHTML =`
                <div class="cargando">
                    <p>Cargando actividades de <strong> ${categoriaSeleccionada}</strong>...</p>
                </div>
            `;

            //Cargar los datos reales del backend mas tarde
        });
    });
});