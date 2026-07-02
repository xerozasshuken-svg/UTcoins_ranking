const pool = require('../config/db');

const obtenerRanking = async (req,res) =>{
    try{
        //Consulta de estudiantes de mayor a menor
        //Limite de 30
        const queryText = `
        SELECT id, nombre, carrera, puntuacion
        FROM estudiantes
        ORDER BY puntuacion DESC
        LIMIT 30`;

        const resultado = await pool.query(queryText);
        //Lista de los mejores
        res.status(200).json({
            mensaje: 'Ranking obtenido con exito',
            ranking: resultado.rows
        });

    }
    catch (error){
        console.error('Error en obtener el Ranking', error.message);
        res.status(500).json({mensaje: 'Error al obtener la tabla de posiciones'});
    }
};

module.exports = {
    obtenerRanking
};