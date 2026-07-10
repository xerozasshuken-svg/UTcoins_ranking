const express = require('express');
const router = express.Router();
const { 
    obtenerActividades,
    inscribirActividad,
    darDeBajaActividad,
    obtenerMisActividades,
    verificarCodigoTexto,
    escanearQrFisico,
    completarActividad,
    crearActividad,
    eliminarActividad 
} = require('../controllers/actividadController');

const verificarToken = require('../middlewares/authMiddleware');
const verificarAdmin = require('../middlewares/adminMiddleware');


router.get('/', verificarToken, obtenerActividades);

router.post('/completar', verificarToken, completarActividad);

router.post('/', verificarToken,verificarAdmin,crearActividad);
router.delete('/eliminar/:id', verificarToken, verificarAdmin, eliminarActividad);

router.get('/mis-actividades', verificarToken, obtenerMisActividades);
router.post('/verificar-codigo', verificarToken, verificarCodigoTexto);
router.post('/escanear-qr', verificarToken, escanearQrFisico);
router.post('/inscribir', verificarToken, inscribirActividad);
router.delete('/baja/:id', verificarToken, darDeBajaActividad);

module.exports = router;