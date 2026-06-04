const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { getConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketinfo')
    .setDescription('ℹ️ Mostra le informazioni del ticket corrente'),

  async execute(interaction) {
    const config = getConfig();
    const ticket = config.openTickets?.[interaction.channel.id];

    if (!ticket) {
      return interaction.reply({
        content: '❌ Questo comando può essere usato solo in un canale ticket aperto!',
        ephemeral: true
      });
    }

    const openedAt = new Date(ticket.openedAt);

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Info Ticket — ${interaction.channel.name}`)
      .addFields(
        { name: '👤 Aperto da', value: ticket.openerTag, inline: true },
        { name: '📂 Tipo', value: ticket.type || 'N/A', inline: true },
        { name: '🎯 Priorità', value: ticket.priority || '`Non impostata`', inline: true },
        { name: '✋ Claimato da', value: ticket.claimedBy || '`Nessuno`', inline: true },
        { name: '🕐 Aperto il', value: `<t:${Math.floor(openedAt.getTime() / 1000)}:F>`, inline: true }
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
