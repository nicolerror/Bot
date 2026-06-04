const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

const defaultConfig = {
  ticketCategoryId: null,
  logChannelId: null,
  reviewChannelId: '1479192100770938962',
  staffRoleId: null,
  transcriptChannelId: null,
  ticketPanelChannelId: null,
  ticketCounter: 0,
  openTickets: {},
  closedTickets: {}
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return { ...defaultConfig };
  }
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return { ...defaultConfig, ...data };
  } catch {
    return { ...defaultConfig };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getConfig() {
  return loadConfig();
}

function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  saveConfig(newConfig);
  return newConfig;
}

module.exports = { getConfig, updateConfig, saveConfig };
