const express = require('express');
const airvisual = require('../entities/air_provider/airvisual');
const constant = require('../constants');
const router = express.Router();

async function getAirQualityByLatLong(req, res) {
	const {provider} = req.query;
	const {lat, long} = req.body;
	if (!provider && !lat && !long) {
		res.status(400).json({message: 'Invalid Input Data'});
	} else {
		if (provider === constant.AIR_VISUAL) {
			try {
				return res.json(await airvisual.getAirByLatLong(lat, long));
			} catch (e) {
				console.error(e.stack);
				res.status(500).json({
					error: e.message,
				});
			}
		} else {
			return res.status(400).json({message: 'Invalid Provider'});
		}
	}
}

async function getAirQualityByCity(req, res) {
	const {provider} = req.query;
	const {state, city, country} = req.body;
	if (!provider && !state && !city) {
		res.status(400).json({message: 'Invalid Input Data'});
	} else {
		if (provider === constant.AIR_VISUAL) {
			try {
				const isAvailable = await airvisual.checkAvailableLocation(city, state,country);
				console.info('Check Available Location :', isAvailable);
				if(isAvailable) {
					return res.json(await airvisual.getAirBySpecificCityData(city, state, country));
				}else {
					return res.status(404).json({ message: 'Not Found Air Quality in this Location' })
				}
			} catch (e) {
				console.error('Error on getAirQualityByCity' + e.stack);
				res.status(500).json({
					error: e.message,
				});
			}
		} else {
			res.status(400).json({message: 'Invalid Provider'});
		}
	}
}

router.post('/', getAirQualityByLatLong);
router.post('/city', getAirQualityByCity);

module.exports = router;