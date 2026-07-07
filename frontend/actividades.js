document.addEventListener('DOMContentLoaded', ()=>{
    //Verificar la seguridad bloqueo sin sesion
    const token = localStorage.getItem('utcoins_token');
    if (!token) {
        window.location.href = 'inicio_sesion.html';
        return;
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