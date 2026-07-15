const pool = require('../db');

const obtenerActividades =  async(req,res) =>{
    const { categoria } = req.query; //Captura lo que viene en categoria
    const  estudianteId = req.usuario.id; //Id del alumno en sesion

    if (!categoria) {
        return res.status(400).json({mensaje: 'La categoria es requerida'});
    }

    try{
        //Filtrar por categoria y comprobar que no haya expirado o ya este registrado
        const resultado = await pool.query(
            `SELECT a.id, a.titulo, a.descripcion, a.utcoins_recompensa AS puntos, a.categoria, a.fecha_expiracion
            FROM actividades a
            LEFT JOIN estudiantes_actividades ea
                ON a.id = ea.actividad_id AND ea.estudiante_id = $2
            WHERE a.categoria = $1
            AND ea.id IS NULL -- CLAVE: Si es NULL significa que el alumno NO esta inscrito
            AND (a.fecha_expiracion IS NULL OR a.fecha_expiracion > NOW())
            ORDER BY a.id DESC`,
            [categoria, estudianteId]
        );

        res.json(resultado.rows);
    }
    catch (error){
        console.error('Error en obtenerActividades:', error.message);
        res.status(500).json({mensaje: 'Error al obtener las actividades'});
    }
};

const inscribirActividad = async (req,res) =>{
    const { actividadId } = req.body;
    const estudianteId = req.usuario.id;

    try{
        //Verificar si la actividad existe y no ha expirado
        const actividad = await pool.query(
          'SELECT * FROM actividades WHERE id = $1 AND (fecha_expiracion IS NULL OR fecha_expiracion > NOW())',
          [actividadId]
        );
        if (actividad.rows.length === 0) {
            return res.status(404).json({ mensaje: 'La actividad no existe o ya ha expirado'});
        }

        //Registrar la inscripcion
        await pool.query(
            `INSERT INTO estudiantes_actividades (estudiante_id, actividad_id)
            VALUES ($1, $2)
            ON CONFLICT (estudiante_id, actividad_id) DO NOTHING`,
            [estudianteId, actividadId]
        );

        res.status(201).json({mensaje: 'Te has registrado en la actividad con exito.'});
    }
    catch (error){
        console.error('Error en inscribirActividad: ', error.message);
        res.status(500).json({mensaje: 'Error interno al registrarse en la actividad'});
    }
};

const darDeBajaActividad = async (req, res) =>{
    const { id } = req.params; //Id de la actividad
    const estudianteId = req.usuario.id;

    try{
        //Verificar si ya esta completo (no se puede dar de baja una vez completo)
        const verificacion = await pool.query(
            'SELECT completado FROM estudiantes_actividades WHERE estudiante_id = $1 AND actividad_id = $2',
            [estudianteId, id]
        );

        if (verificacion.rows.length > 0 && verificacion.rows[0].completado) {
            return res.status(400).json({mensaje: 'No puedes dar de baja una actividad que ya has completado'});
        }

        await pool.query(
            'DELETE FROM estudiantes_actividades WHERE estudiante_id = $1 AND actividad_id = $2',
            [estudianteId, id]
        );

        return res.json({mensaje: 'Te has dado de baja de la actividad correctamente'});
    }
    catch (error){
        console.error('Error interno al dar de baja la actividad: ', error.message);

        return res.status(500).json({mensaje: 'Error interno al inentar dar de baja la actividad'});
    }
};

const obtenerMisActividades = async (req,res) =>{
    const estudianteId = req.usuario.id;

    try{
        //Unimos estudiantes_actividades con actividades
        const resultado = await pool.query(
            `SELECT a.id, a.titulo, a.descripcion, a.utcoins_recompensa AS puntos,
                    ea.codigo_verificado, ea.qr_escaneado, ea.completado
            FROM estudiantes_actividades ea
            JOIN actividades a ON ea.actividad_id = a.id
            WHERE ea.estudiante_id = $1
            AND ea.completado = FALSE -- CLAVE: Desaparece de "Mis actividades"
            ORDER BY ea.id DESC`,
            [estudianteId]
        );

        res.json(resultado.rows);
    }
    catch (error){  
        console.error('Error en obtenerMisActividades: ',error.message);
        res.status(500).json({mensaje: 'Error interno al obtener tus actividades'});
    }
};

const verificarCodigoTexto = async (req,res) =>{
    const { actividadId, codigoTexto } = req.body;
    const estudianteId = req.usuario.id;

    try{
        //Verificar inscripcion
        const inscripcion = await pool.query(
            'SELECT codigo_verificado, qr_escaneado FROM estudiantes_actividades WHERE estudiante_id = $1 AND actividad_id = $2',
            [estudianteId, actividadId]
        );
        
        if (inscripcion.rows.length === 0) {
            return res.status(400).json({mensaje: 'Ya has verificado el codigo de texto para esta actividad '});
        }

        //Validar contra el codigo Qr culto de la tabla de actividades
        const actividad = await pool.query('SELECT codigo_verificacion FROM actividades WHERE id = $1', [actividadId]);

        if (actividad.rows[0].codigo_verificacion.toUpperCase() !== codigoTexto.toUpperCase()) {
            return res.status(400).json({ mensaje: 'El código de validación de texto es incorrecto.' });
        }

        //Marcar primer paso como completado
        await pool.query(
            `UPDATE estudiantes_actividades
            SET codigo_verificado = TRUE
            WHERE estudiante_id = $1 AND actividad_id = $2`,
            [estudianteId, actividadId]
        );

        res.status(200).json({mensaje: 'Codigo verificado con exito. Escanea el QR para recibir los puntos'});
    }
    catch(error){
        console.error('Error en verificarCodigoTexto: ', error.message);
        res.status(500).json({mensaje: 'Error interno del servidor'});
    }
};

const escanearQrFisico = async (req,res) =>{
    const {actividadId, contenidoQR } = req.body;
    const estudianteId = req.usuario.id;

    try{
        //Verifica que haya hecho el paso previo (codigo de texto)
        const inscripcion = await pool.query(
            'SELECT codigo_verificado, qr_escaneado FROM estudiantes_actividades WHERE estudiante_id = $1 AND actividad_id = $2',
            [estudianteId, actividadId]
        );

        if (inscripcion.rows.length === 0 || !inscripcion.rows[0].codigo_verificado) {
            return res.status(400).json({ mensaje: 'Primero debes verificar el código de texto de la actividad antes de escanear el QR.' });
        }

        if (inscripcion.rows[0].qr_escaneado) {
            return res.status(400).json({ mensaje: 'Ya has reclamado los puntos de esta actividad.' });
        }

        //Verificar que el QR escaneado sea el correcto
        const actividad = await pool.query(
            'SELECT utcoins_recompensa, codigo_verificacion FROM actividades WHERE id = $1', 
            [actividadId]
        );
        
        if (actividad.rows.length === 0) {
            return res.status(404).json({ mensaje: 'La actividad no existe.' });
        }

        if (actividad.rows[0].codigo_verificacion.toUpperCase() !== contenidoQR.toUpperCase()) {
            return res.status(400).json({ mensaje: 'El código QR escaneado no pertenece a esta actividad.' });
        }

        const puntos = actividad.rows[0].utcoins_recompensa;

        //transaccion segura: Guardar estado final y pagar
        await pool.query('BEGIN');

        await pool.query(
            `UPDATE estudiantes_actividades
            SET qr_escaneado = TRUE, completado = TRUE
            WHERE estudiante_id = $1 AND actividad_id = $2`,
            [estudianteId, actividadId]
        );

        await pool.query(
            `UPDATE estudiantes
            SET puntuacion = COALESCE(puntuacion, 0) + $1
            WHERE id = $2`,
            [puntos, estudianteId]
        );

        await pool.query('COMMIT');

        res.status(200).json({mensaje: `QR escaneado con exito, Has ganado +${puntos} UTcoins`});
    }
    catch(error){
        await pool.query('ROLLBACK');
        console.error('Error en escanearQRFisico: ', error.message);
        res.status(500).json({mensaje: 'Error interno al proceder el escaneo del QR'});
    }
};

//REGISTRO DE ACTIVIDAD Y SUMAR PUNTOS
const completarActividad = async (req, res)=>{
    const{ actividadId, qrEscaneado } = req.body;
    const estudianteId = req.usuario.id;

    try{
        //Verificar la actividad existente y su puntuacion
        const actividadCheck = await pool.query('SELECT * FROM actividades WHERE id = $1', [actividadId]);
        if (actividadCheck.rows.length === 0) {
            return res.status(404).json({mensaje: 'La actividad no existe'});
        }

        const actividad = actividadCheck.rows[0];

        if (actividad.codigo_qr !== qrEscaneado) {
            return res.status(400).json({mensaje: 'El codigo QR escaneado no es valido'});
        }

        if (actividad.fecha_expiracion && new Date() > new Date(actividad.fecha_expiracion)) {
            return res.status(400).json({mensaje: 'Esta actividad ya expiro'});
        }
        //Verificar si el estudiante ya la habia complentado
        const registroChek = await pool.query(
            'SELECT * FROM estudiantes_actividades WHERE estudiante_id = $1 AND actividad_id = $2',
            [estudianteId, actividadId]
        );

        if (registroChek.rows.length > 0) {
            return res.status(400).json({ mensaje: 'ya has reclamado los UTcoins de esta actividad'});
        }
        //Asegurar que se guarden ambas cosas o ninguna
        await pool.query('BEGIN');

        //REGISTRAR EN EL HISTORIAL DEL ALUMNO
        await pool.query(
            'INSERT INTO estudiantes_actividades (estudiante_id, actividad_id) VALUES ($1, $2)',
            [estudianteId, actividadId]
        );

        //SUMAR UTcoins al estudiante
        await pool.query(
            'UPDATE estudiante SET puntuacion = puntuacion + $1 WHERE id = $2',
            [actividad.utcoins_recompensa, estudianteId]
        );

        //Confirmar los cambios
        await pool.query('COMMIT');

        res.status(200).json({
            mensaje: `Codigo verificado. Ganaste ${actividad.utcoins_recompensa} UTcoins`,
            puntosGanados: actividad.utcoins_recompensa
        });
        
    }
    catch(error){
        await pool.query('ROLLBACK');
        console.error('Error en completarActividad: ', error.message);
        res.status(500).json({mensaje: 'Error interno al procesar la recompensa'});
    }
};

const generarCodigoUnico = () =>{
    const carracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = 'UTC-';

    for(let i = 0; i<5; i++){
        resultado += carracteres.charAt(Math.floor(Math.random() * carracteres.length));
    }

    return resultado;
};

const crearActividad = async (req, res) =>{

    const {titulo, descripcion, puntos, categoria, fecha_expiracion} = req.body;

    const codigoVerificacion = generarCodigoUnico();

    try{
        //Insertar en la base de datos usando campos reales
        const nuevaActividad = await pool.query(
            `INSERT INTO actividades (titulo, descripcion, utcoins_recompensa, categoria, fecha_expiracion, codigo_verificacion)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [titulo, descripcion, puntos, categoria, fecha_expiracion, codigoVerificacion]
        );

        res.status(201).json({
            mensaje: 'Actividad creada con exito por el admin',
            actividad: nuevaActividad.rows[0]
        });
    }
    catch (error){
        console.error('Error al crearActividad', error.message);
        res.status(500).json({mensaje: 'Error interno al crear la actividad'});
    }
};

const obtenerActividadesPorCategoria = async (req, res) =>{
    const { categoria } = req.query;

    if (!categoria) {
        return res.status(400).json({mensaje: 'La categoria es requerida'});
    }

    try{
        //Trae las actividades donde la categoria coincida
        const resultado = await pool.query(
            `SELECT id, titulo, descripcion, puntos, categoria, fecha_expiracion
            FROM actividades
            WHERE categoria = $1
            AND (fecha_expiracion IS NULL OR fecha_expiracion > NOW())
            ORDER BY id DESC`,
            [categoria]
        );

        res.json(resultado.rows);
    }   
    catch (error){
        console.error('Error en obtenerActividadesPorCategoria: ', error.message);
        res.status(500).json({mensaje: 'Error interno del servidor al obtener las '});
    }
};

const eliminarActividad = async (req, res) =>{

    const{id} = req.params;

    try{
        //Verificar si la actividad existe
        const chek = await pool.query('SELECT * FROM actividades WHERE id = $1', [id]);
        if (chek.rows.length === 0) {
            return res.status(404).json({mensaje: 'La actividad que intentas eliminar no existe'});
        }

        //Eliminar actividad
        await pool.query('DELETE FROM actividades WHERE id = $1', [id]);

        res.status(200).json({mensaje: 'Actividad eliminada correctamente'});

    }
    catch (error)
    {
        console.error('Error en eliminarActividad: ', error.mensaje);

        //PostgreSQL bloqueara si ya fgue completada por llave foranea
        if (error.code === '23503') {
            return res.status(400).json({
                mensaje: 'No se puede elminar la actividad'
            });
        }

        res.status(500).json({mensaje: 'Error interno al intentar eliminar la actividad'});
    }
};


module.exports = {
    obtenerActividades,
    inscribirActividad,
    darDeBajaActividad,
    obtenerMisActividades,
    verificarCodigoTexto,
    escanearQrFisico,
    completarActividad,
    crearActividad,
    obtenerActividadesPorCategoria,
    eliminarActividad
};