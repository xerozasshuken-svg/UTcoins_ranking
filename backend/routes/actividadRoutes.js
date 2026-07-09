const express = require('express');
const router = express.Router();
const { obtenerActividades, completarActividad, crearActividad, eliminarActividad } = require('../controllers/actividadController');
const verificarToken = require('../middlewares/authMiddleware');
const verificarAdmin = require('../middlewares/adminMiddleware');


router.get('/', verificarToken, obtenerActividades);
router.post('/', verificarToken,verificarAdmin,crearActividad);
router.post('/completar', verificarToken, completarActividad);
router.delete('/eliminar/:id', verificarToken, verificarAdmin, eliminarActividad);

module.exports = router;