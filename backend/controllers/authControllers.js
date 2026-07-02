const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


//Registro de estudiantes
const registrarEstudiante = async (req, res) => {
    console.log("Lo que el backend está recibiendo en el req.body:", req.body);
    const { nombre, carrera, matricula, email, password } = req.body;

    try{
        //verificar si el correo existe
        const existeUsuario = await pool.query('SELECT *FROM estudiantes WHERE email = $1', [email]);
        if (existeUsuario.rows.length > 0) {
            return res.status(400).json({ mensaje: 'El correo electronico ya esta registrado'});
        }

        const existeMatricula = await pool.query('SELECT * FROM estudiantes WHERE matricula = $1', [matricula]);
        if (existeMatricula.rows.length > 0) {
            return res.status(400).json({mensaje: 'La matricula ya esta registrada'});
        }
        
        //Ecriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt); 
    

        const nuevoEstudiante = await pool.query(
            `INSERT INTO estudiantes (nombre, email, password, carrera, matricula) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, carrera, matricula`,
            [nombre, email, passwordHash, carrera, matricula]
        );

        res.status(201).json({
            mensaje: 'Estudiante registrado con exito',
            estudiante: nuevoEstudiante.rows[0]
        });
    }
    catch (error){
        console.error('Error en registrarEstudiante: ', error.message);
        res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

//Inicio de sesion
const loginEstudiante = async (req, res) =>{
    const { email, password} = req.body;

    try{
        //Buscar estudiante por email
        const resultado = await pool.query('SELECT id, nombre, email, password, carrera, matricula FROM estudiantes WHERE email = $1', [email]);
        
        if (resultado.rows.length === 0) {
            return res.status(400).json({ mensaje: 'Credenciuales incorrectos (Email no encontrado).'});
        }
        
        const estudiante = resultado.rows[0];

        //validar contraseña
        const passwordCorrecto = await bcrypt.compare(password, estudiante.password);
        if (!passwordCorrecto) {
            return res.status(400).json({mensaje: 'Credenciales incorrectos (Contraseña invalida).'});
        }
    

        //Generar token JWT
        const token = jwt.sign(
            { id: estudiante.id, nombre: estudiante.nombre},
            process.env.JWT_SECRET,
            {expiresIn: '8h'}
        );

        res.json({
            mensaje: 'Login exitoso',
            token,
            estudiante: {
                id: estudiante.id,
                nombre: estudiante.nombre,
                email: estudiante.email,
                carrera: estudiante.carrera,
                puntuacion: estudiante.puntuacion,
                matricula: estudiante.matricula                
            }
        });
    }
    catch (error){
        console.error('Error en loginEstudiante: ',error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor'});
    }
};

module.exports = {
    registrarEstudiante,
    loginEstudiante
};