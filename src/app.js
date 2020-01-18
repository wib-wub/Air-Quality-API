const express = require('express');
const {resolve} = require('path');
require('dotenv').config({path: resolve(__dirname, '../.env')});
const healthCheckController = require('./controllers/healthcheck.controller');
const airQulityController = require('./controllers/airqulity.controller');
const bodyParser = require('express');
const app = express();

app.use(bodyParser.json());

app.use('/healthcheck', healthCheckController);
app.use('/api/v1/air',airQulityController);


const port = process.env.PORT;
app.listen(port, (error) => {
	if (error) {
		process.exit(1);
	}

	console.info(`Application Listening on Port ${port}`);
});