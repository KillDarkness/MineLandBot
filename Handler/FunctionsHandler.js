const fs = require('fs');
const path = require('path');

module.exports = (client) => {

	const { checkActiveMutes } = require('../functions/CheckMute');
	checkActiveMutes(client);
	
}