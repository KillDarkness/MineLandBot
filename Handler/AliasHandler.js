require('module-alias/register');
const { addAliases } = require('module-alias');
const path = require('path');

// Carrega os aliases do paths.json
const paths = require('../paths.json');
addAliases(paths);