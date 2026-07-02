const express = require('express');
const router = express.Router();
const { obtenerRanking } = require('../controllers/rankingControllers');
const verificarToken = require('../middlewares/authMiddleware');

//Definir la ruta para el ranking
// El endpoint completo será: GET /api/ranking
router.get('/', verificarToken, obtenerRanking);

module.exports = router;