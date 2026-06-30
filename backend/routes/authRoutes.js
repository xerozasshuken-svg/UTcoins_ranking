const express = require('express');
const router = express.Router();
const { registrarEstudiante, loginEstudiante} = require('../controllers/authControllers');

//Rutas
router.post('/register', registrarEstudiante);
router.post('/login', loginEstudiante);

module.exports = router;


