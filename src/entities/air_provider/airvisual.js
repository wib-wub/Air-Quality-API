const axios = require('axios');
const redis = require('../../utils/redis');
const {REDIS_CITY, REDIS_STATE, REDIS_COUNTRY} = require('../../constants');


class Airvisual {

	constructor() {
		this.http = axios.create({
			baseURL: process.env.AIRVISUAL_URL,

		});

		this.http.interceptors.request.use(config => {
			return {
				...config,
				params: {
					key: process.env.APIKEY,
				},
			};
		});

		this.http.interceptors.response.use(response => {
			return response;
		});
	}

	_airQualityGrade(aqi) {
		const qualityPoint = aqi;
		if (qualityPoint >= 301 && qualityPoint <= 500) {
			return 'เป็นอันตราย';
		} else if (qualityPoint >= 201 && qualityPoint <= 300) {
			return 'ไม่ดีต่อสุขภาพอย่างมาก';
		} else if (qualityPoint >= 151 && qualityPoint <= 200) {
			return 'ไม่ดีต่อสุขภาพ';
		} else if (qualityPoint >= 101 && qualityPoint <= 150) {
			return 'ไม่ดีต่อสุขภาพสำหรับกลุ่มที่อ่อนไหว';
		} else if (qualityPoint >= 51 && qualityPoint <= 100) {
			return 'ปานกลาง';
		} else {
			return 'ดี';
		}
	}

	_transformData({data, status}) {
		const {current: {pollution}, city } = data;
		if (status !== 'success') {
			return new Error('Request to AIRVISUAL FAILED');
		} else {
			return {
				message: this._airQualityGrade(pollution.aqius),
				aqi: pollution.aqius,
				timestamp: pollution.ts,
				location: `${city}`
			};
		}
	}

	async _getCacheAvailableLocation() {
		try {
			const rawCountry = await redis.get(REDIS_COUNTRY);
			const rawState = await redis.get(REDIS_STATE);
			const rawCity = await redis.get(REDIS_CITY);

			return {
				countries: rawCountry ? JSON.parse(rawCountry) : [],
				cities: rawCity ? JSON.parse(rawCity) : [],
				states: rawState ? JSON.parse(rawState) : [],
			};
		}catch (e) {
			throw e;
		}
	}

	async _saveAvailableLocationCache(_state, _country) {
		try {
			console.log('Find Available Country');
			const {data: {data: country}} = await this.http.get('/countries');
			console.log('Get Available Country from cache');
			const oldCountryCache = await redis.get(REDIS_COUNTRY);
			const oldCountryList = JSON.parse(oldCountryCache);
			let currentCountryList = [
				...country.map(({country}) => country),
			];
			if (oldCountryList instanceof Array) {
				currentCountryList = [
					...currentCountryList,
					...oldCountryList,
				]
			}
			await redis.set(REDIS_COUNTRY, JSON.stringify(currentCountryList));

			console.log('Find Available State');
			const {data: {data: state}} = await this.http.get(`/states?country=${_country}`);
			console.log('Get Available State from cache');
			const oldStateCache = await redis.get(REDIS_STATE);
			const oldStateList = JSON.parse(oldStateCache);
			let currentStateList = [
				...state.map(({state}) => state),
			];
			if (oldStateList instanceof Array) {
				currentStateList = [
					...currentStateList,
					...oldStateList,
				]
			}
			await redis.set(REDIS_STATE, JSON.stringify(currentStateList));

			console.log('Find Available City');
			const {data: {data: cities}} = await this.http.get(`/cities?state=${_state}&country=${_country}`);
			console.log('Get Available State from City');
			const oldCitiesCache = await redis.get(REDIS_CITY);
			const oldCitiesList = JSON.parse(oldCitiesCache);
			let currentCitiesList = [
				...cities.map(({city}) => city),
			];
			if (oldCitiesList instanceof Array) {
				currentCitiesList = [
					...currentCitiesList,
					...oldCitiesList,
				]
			}
			await redis.set(REDIS_CITY, JSON.stringify(currentCitiesList));
		}catch (e) {
			console.warn('Warning on save available location cache', e.message);
		}
	}


	async checkAvailableLocation(city, state, country) {
		try {
			const {countries, states, cities} = await this._getCacheAvailableLocation();
			const result = {
				city: cities.includes(city),
				state: states.includes(state),
				country: countries.includes(country),
			};
			console.log(result);
			console.log('Check Available Location', result);
			if (Object.values(result).includes(false)) {
				console.log('Find Available From Source');
				await this._saveAvailableLocationCache(state, country);
				const {countries, states, cities} = await this._getCacheAvailableLocation();
				return countries.includes(country) && cities.includes(city) && states.includes(state);
			} else {
				return true;
			}
		}catch (e) {
			throw e;
		}

	}

	/**
	 *
	 * @returns {Promise<boolean>} AirVisual Status
	 */
	async healthCheck() {
		const {status} = await this.http.get('/countries');
		return status === 200;
	}

	/**
	 *
	 * @param {number|string} lat
	 * @param {number|string} long
	 * @returns {Promise<Error | {aqi : *, message : string, timestamp : string}>}
	 */
	async getAirByLatLong(lat, long) {
		try {
			const {data} = await this.http.get(`/nearest_city?lat=${lat}&long=${long}`);
			return this._transformData(data);
		} catch (e) {
			throw e;
		}
	}

	/**
	 *
	 * @param {string} city
	 * @param {string} state
	 * @param {string} country
	 * @returns {Promise<Error | {aqi : *, message : string, timestamp : string}>}
	 */
	async getAirBySpecificCityData(city, state, country) {
		try {
			const {data} = await this.http.get(`/city?city=${city}&state=${state}&country=${country}`);
			return this._transformData(data);
		} catch (e) {
			throw e;
		}
	}
}

module.exports = new Airvisual();