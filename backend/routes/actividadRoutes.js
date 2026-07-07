const express = require('express');
const router = express.Router();
const { obtenerActividades, completarActividad, crearActividad, eliminarActividad } = require('../controllers/actividadController');
const verificarToken = require('../middlewares/authMiddleware');
const verificarAdmin = require('../middlewares/adminMiddleware');
const { route } = require('./rankingRoutes');

router.get('/', verificarToken, obtenerActividades);
router.post('/completar', verificarToken, completarActividad);
router.post('/crear', verificarToken, verificarAdmin, crearActividad);
router.delete('/eliminar/:id', verificarToken, verificarAdmin, eliminarActividad);

module.exports = router;