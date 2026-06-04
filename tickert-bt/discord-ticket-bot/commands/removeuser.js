const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { getConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeuser')
    .setDescription('➖ Rimuovi un utente dal ticket corrente (solo staff)')
    .addUserOption(opt =>
      opt.setName('utente')
        .setDescription('Utente da rimuovere dal ticket')
        .setRequired(true)
    ),

  async execute(interaction) {
    const config = getConfig();

    const isStaff =
      (config.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId)) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Solo lo staff può rimuovere utenti dai ticket!',
        ephemeral: true
      });
    }

    const ticket = config.openTickets?.[interaction.channel.id];
    if (!ticket) {
      return interaction.reply({
        content: '❌ Questo comando può essere usato solo in un canale ticket aperto!',
        ephemeral: true
      });
    }

    const target = interaction.options.getMember('utente');

    // Non rimuovere l'opener del ticket
    if (target.id === ticket.openerId) {
      return interaction.reply({
        content: '❌ Non puoi rimuovere chi ha aperto il ticket!',
        ephemeral: true
      });
    }

    await interaction.channel.permissionOverwrites.edit(target.id, {
      ViewChannel: false
    });

    await interaction.reply({
      content: `✅ ${target} è stato rimosso dal ticket da ${interaction.user}.`
    });
  }
};
