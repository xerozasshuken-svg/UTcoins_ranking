const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const authRoutes = require('./routes/authRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const actividadRoutes = require('./routes/actividadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

//Middleware globales
app.use(cors()); 
app.use(express.json());


//Vincular rutas
app.use('/api/auth', authRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/actividades', actividadRoutes);

//ruta de prueba para verificar
app.get('/api/prueba', (req, res) =>{
    res.json({ mensaje: "servidor UTcoins corriendo prefectamente"});
});

app.listen(PORT, async () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);

    try{
        const res = await pool.query('SELECT NOW()');
        console.log('Conexion verificada con la BD a las: ', res.rows[0].now);
    }
    catch (errs){
        console.error('Error al conectar con la base de datos: ', errs.message);
    }
});
