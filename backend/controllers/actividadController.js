const pool = require('../db');

const obtenerActividades =  async(req,res) =>{
    try{
        const resultado = await pool.query('SELECT * FROM actividades ORDER BY id ASC');
        res.status(200).json({
            mensaje: 'Actividades obtenidas con exito',
            actividades: resultado.rows
        });
    }
    catch (error){
        console.error('Error en obtener actividades:', error.message);
        res.status(500).json({mensaje: 'Error al cargar las actividades'});
    }
};

//REGISTRO DE ACTIVIDAD Y SUMAR PUNTOS
const completarActividad = async (req, res)=>{
    const{ actividadId } = req.body;
    const estudianteId = req.usuario.id;

    try{
        //Verificar la actividad existente y su puntuacion
        const actividadCheck = await pool.query('SELECT * FROM actividades WHERE id = $1', [actividadId]);
        if (actividadCheck.rows.length === 0) {
            return res.status(404).json({mensaje: 'La actividad no existe'});
        }

        const recompensa = actividadCheck.rows[0].utcoins_recompensa;

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
            [recompensa, estudianteId]
        );

        //Confirmar los cambios
        await pool.query('COMMIT');

        res.status(200).json({
            mensaje: `Actividad completada. Ganaste ${recompensa} UTcoins`,
            puntosGanados: recompensa
        });
    }
    catch(error){
        await pool.query('ROLLBACK');
        console.error('Error en completarActividad: ', error.message);
        res.status(500).json({mensaje: 'Error interno al procesar la recompensa'});
    }
};

const crearActividad = async (req, res) =>{

    const {titulo, descripcion, utcoins_recompensa, categoria, minutos_validez} = Request.body;

    try{
        //Calcular la fecha de expiracion sumando los minutos a la hora actual
        let fecha_expiracion = null;

        if (minutos_validez && minutos_validez > 0) {
            fecha_expiracion = new Date();
            fecha_expiracion.setMinutes(fecha_expiracion.getMinutes() + parseInt(minutos_validez));
        }
        
        //Codigo aleatorio para QR
        const codigo_qr = `RETO-${Math.floor(100000 + Math.random() * 900000)}`;
    
        //Insertar en la base de datos usando campos reales
        const quertText = `
            INSERT INTO actividades (titulo, descripcion, utcoins_recompensa, categoria, codigo_qr, fecha_expiracion)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`;

        const valores = [titulo, descripcion, utcoins_recompensa, categoria, codigo_qr, fecha_expiracion];
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

module.exports = {
    obtenerActividades,
    completarActividad,
    crearActividad
};