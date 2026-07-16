document.addEventListener('DOMContentLoaded', async () =>{

    //Verificar sesion y token
    const token = localStorage.getItem('utcoins_token') || localStorage.getItem('token');
    const usuarioString = localStorage.getItem('utcoins_user');

    if (!token || !usuarioString) {
        window.location.href = 'inicio_sesion.html';
        return;
    }

    const usuarioLogueado = JSON.parse(usuarioString);
    const API_URL = 'http://10.55.89.124:3000/api/ranking';

    const navNombre = document.getElementById('nav-nombre-usuario');
    const navPuntos = document.getElementById('nav-puntos-usuario');
    const miRangoActual = document.getElementById('mi-rango-actual');
    const tablaCuerpo = document.getElementById('tabla-cuerpo-ranking');
    const botonesFiltro = document.querySelectorAll('.btn-categoria');

    let filtroActual = 'campus';//Filtro inicial

    //Mostrar datos del usuario en el baner
    if (navNombre) {
        navNombre.textContent = usuarioLogueado.nombre;
    }
    
    async function actualizarPuntosBanner() {
        try {
            const respuesta = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (respuesta.ok) {
                const datos = await respuesta.json();
                //Buscamos al estudiante login dentro de la lista
                const yo = datos.ranking.find(est => est.id === usuarioLogueado.id);

                if (yo && navPuntos) {
                    navPuntos.textContent = `${yo.puntuacion} UTcoins`;

                    //Actualizamos el localStorage para tomar el valor real
                    usuarioLogueado.puntuacion = yo.puntuacion;
                    localStorage.setItem('utcoins_user', JSON.stringify(usuarioLogueado));
                }
                else if (navPuntos) {
                    //Si no esta en el top 3 dejamos el valor del localStorage como respaldo
                    navNombre.navPuntos.textContent =`${usuarioLogueado.puntuacion || 0} UTcoins`;
                }
            }
        }
        catch (error) {
            console.error("Error al actualizar puntos del banner: ", error);
            if (navPuntos) {
                navPuntos.textContent = `${usuarioLogueado.puntuacion || 0} UTcoins`;
            }
        }
    }
    
    await actualizarPuntosBanner();

    //Cargar y renderizar el ranking
    async function cargarRanking() {
        tablaCuerpo.innerHTML = `
        <tr><td colspan="4" style="text-aling: center; coler: #888;">Cargando posiciones...
        </td></tr>`;
    

        try {
            //Construir la URL con el parametro de carrera
            let url = API_URL;
            if (filtroActual === 'carrera' && usuarioLogueado.carrera) {
                url += `?carrera=${encodeURIComponent(usuarioLogueado.carrera)}`;
            }
            
            const respuesta = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }   
            });

            if (!respuesta.ok) {
                throw new Error(`Error en la respuesta del servidor`);
        }
        
        const datos = await respuesta.json();
        const ranking = datos.ranking;

        renderizarTabla(ranking);
        actualizarMiRango(ranking);
        }
        catch (error) {
            console.error('Erroa l cargar el ranking: ', error);
            tablaCuerpo.innerHTML = `
            <tr><td colspan="4" style="text-aling: center; color: red;">Errora al conectar con el servidor
            </td></tr>`;
        }
    }

    function renderizarTabla(ranking) {
        tablaCuerpo.innerHTML = '';

        if (ranking.length === 0) {
            tablaCuerpo.innerHTML = `
            <tr><td colspan="4" style="text-aling: center; color: #888;">No hay alumnos registrados en esta categoria
            </td></tr>`;
            return;
        }

        ranking.forEach((estudiante, index) => {
            const posicion = index +1;
            let claseTop = '';

            //Resaltamos los 3 primeros puestos con un estilo visual
            if (posicion === 1) {claseTop = 'top-1';}
            else if (posicion === 2) {claseTop = 'top-2';}
            else if (posicion === 3) {claseTop = 'top-3';}

            //Fondo sutil si la fila pertenece al estudiante logueado
            const esUsuarioActual = estudiante.id === usuarioLogueado.id;
            const filaEstilo = esUsuarioActual ? 'style="background-color: #e8f8f0; font-weight: 600;"' : '';

            const filaHTML = `
                <tr ${filaEstilo}>
                    <td class="${claseTop}">#${posicion}</td>
                    <td> ${estudiante.nombre} ${esUsuarioActual ? '<strong>(Tu)</strong>' : ''}</td>
                    <td> ${estudiante.carrera}</td>
                    <td style="font-weight: bold; color: #3EC768;">${estudiante.puntuacion} pts</td>
                </tr>
            `;
            tablaCuerpo.insertAdjacentHTML('beforeend', filaHTML);
        });
    }
    //Calcular y mostrar la posicion del usuario en la tarjeta
    function actualizarMiRango(ranking) {
        //Buscamos si el estudiante actual esta dentro del top
        const indexEncontrado = ranking.findIndex(est => est.id === usuarioLogueado.id);

        if (indexEncontrado !== -1) {
            //Si esta dentro de la lista se muestra la posicion real
            miRangoActual.textContent = `#${indexEncontrado + 1}`;
        }
        else {
            //Si no esta en el top de mejores (30)
            miRangoActual.textContent = 'Top 30+';
        }
    }

    //Eventos para cambiar de pestaña (campus y carrera)
    botonesFiltro.forEach(boton =>{
        boton.addEventListener('click', (e) =>{
            //Quitar clase activo a todos y ponerl el seleccionado
            botonesFiltro.forEach(btn => btn.classList.remove('activo'));
            boton.classList.add('activo');

            //Actualizar filtro y recargar datos
            filtroActual = boton.getAttribute('data-filtro');
            cargarRanking();
        });
    });
    //Cargar e ranking inicial
    cargarRanking();
});

