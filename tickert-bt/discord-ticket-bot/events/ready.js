module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`\n🤖 Bot online come: ${client.user.tag}`);
    console.log(`📡 Connesso a ${client.guilds.cache.size} server`);
    client.user.setActivity('🎫 Gestione Ticket', { type: 3 });
  }
};
