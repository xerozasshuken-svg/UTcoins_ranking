const pool = require('../db');

const obtenerActividades =  async(req,res) =>{
    const { categoria } = req.query; //Captura lo que viene en categoria

    if (!categoria) {
        return res.status(400).json({mensaje: 'La categoria es requerida'});
    }

    try{
        //Filtrar por categoria y comprobar que no haya expirado
        const resultado = await pool.query(
            `SELECT id, titulo, descripcion, utcoins_recompensa AS puntos, categoria, fecha_expiracion
            FROM actividades
            WHERE categoria = $1
            AND (fecha_expiracion IS NULL OR fecha_expiracion > NOW())
            ORDER BY id DESC`,
            [categoria]
        );

        res.json(resultado.rows);
    }
    catch (error){
        console.error('Error en obtenerActividades:', error.message);
        res.status(500).json({mensaje: 'Error al obtener las actividades'});
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

const crearActividad = async (req, res) =>{

    const {titulo, descripcion, puntos, categoria, fecha_expiracion} = req.body;

    try{
        
        //Codigo aleatorio para QR
        const codigo_qr = `RETO-${Math.floor(100000 + Math.random() * 900000)}`;
    
        //Insertar en la base de datos usando campos reales
        const quertText = `
            INSERT INTO actividades (titulo, descripcion, utcoins_recompensa, categoria, codigo_qr, fecha_expiracion)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`;

        const valores = [titulo, descripcion, puntos, categoria, codigo_qr, fecha_expiracion];
        const resultado = await pool.query(quertText, valores);

        res.status(201).json({
            mensaje: 'Actividad creada con exito por el admin',
            actividad: resultado.rows[0]
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
    completarActividad,
    crearActividad,
    obtenerActividadesPorCategoria,
    eliminarActividad
};