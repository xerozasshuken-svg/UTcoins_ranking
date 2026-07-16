const pool = require('../db');

const obtenerRanking = async (req,res) =>{
    const { carrera } = req.query;
    try{
        //Consulta de estudiantes de mayor a menor
        //Limite de 30
        let queryText = '';
        let queryParams = [];

        if (carrera) {
            queryText = `
                SELECT id, nombre, carrera, puntuacion
                FROM estudiantes
                WHERE LOWER(carrera) = LOWER($1)
                ORDER BY puntuacion DESC
                LIMIT 30`;  
            queryParams = [carrera];
        }
        else{
            //Consulta geneneral
            queryText = `
            SELECT id, nombre, carrera, puntuacion
            FROM estudiantes
            ORDER BY puntuacion DESC
            LIMIT 30`;
        }
        

        const resultado = await pool.query(queryText, queryParams);
        
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