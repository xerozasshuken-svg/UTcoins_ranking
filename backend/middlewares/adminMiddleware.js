const verificarAdmin = (req, res, next) =>{
    
    //requ.usuario viene de verificarToken (authMiddleware) que lee el JWT
    if (!req.usuario) {
        return res.status(401).json({mensaje: 'No autenticado. Token requerido'});
    }

    //Verificar si el rol guardado es admin}
    if (req.usuario.role !== 'admin' && req.usuario.rol !== 'admin') {
        return res.status(403).json({mensaje: 'Acceso denegado. Se requieren permisos de administrador'});
    }
    next();
};

module.exports = verificarAdmin;