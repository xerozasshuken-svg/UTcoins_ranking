const jwt = require('jsonwebtoken');
const verificarToken = (req,res,bext) =>{

    const tokenHeader = req.header('Authorization');
    if(!tokenHeader){
        return res.status(401).jso0n({mensaje: 'Acceso denegado. No se proporciono un token'});
    }

    const token = tokenHeader.split(' ')[1];
    if(!token){
        return res.status(401).json({mensaje: 'Acceso denegado. Formato de token iunvalido'});
    }

    try{
        //Verificar el token con la clave en .env
        const cifrado = jwt.verify(token, process.env.JWT_SECRET);

        req.estudiante = cifrado;
        next();
    }
    catch(error){
        res.status(403).json({mensaje: 'Token invalido o expirado'});
    }

};

module.exports = verificarToken;