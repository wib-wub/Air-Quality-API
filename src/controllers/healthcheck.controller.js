const express = require('express');
const airvisual = require('../entities/air_provider/airvisual');
const router = express.Router();

async function healthcheck(req, res) {
	try {
		const result = await airvisual.healthCheck();
		res.json({
			air_visual: result ? 'OK' : 'DEAD',
		})
	}catch(error) {
		res.status(500).json({error})
	}
}


router.get('/', healthcheck);


module.exports = router;

