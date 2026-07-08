const pool = require('./db');
const bcrypt = require('bcrypt');

const verificarOCrearAdmin = async() =>{
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    //Si no esta en el .env detenemos el proceso
    if(!adminUser || !adminPass){
        console.log('Advertencia: No se detectaron las variables de entorno');
        return;
    }

    try{
        //Buscar si ya existe el usuario admin
        //Ajusta usuario o matricula segun el nombre exacto
        const resultado = await pool.query('SELECT * FROM estudiantes WHERE email = $1', [adminUser]);

        if (resultado.rows.length ===0) {
            console.log('Creando el administrador por primera vez');

            //Encriptar la contraseña del archivo .env
            const saltRounds = 10;
            const passwordEncriptada = await bcrypt.hash(adminPass, saltRounds);

            //Insertar el administrador con rol admin matricula "0"
            await pool.query(
                `INSERT INTO estudiantes (matricula, email, password, rol, nombre, carrera)
                VALUES (0, $1, $2, 'admin', 'Administrador General', 'N/A')`,
                [adminUser, passwordEncriptada]
            );

            console.log('Administrador creado con exito');
        }
        else{
            console.log('El administrador ya existe en el sistema');
        }
    }
    catch (error){
        console.error('Error al inicializar el administrador: ', error);
    }
};

module.exports = verificarOCrearAdmin;