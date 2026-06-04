const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { getConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adduser')
    .setDescription('➕ Aggiungi un utente al ticket corrente (solo staff)')
    .addUserOption(opt =>
      opt.setName('utente')
        .setDescription('Utente da aggiungere al ticket')
        .setRequired(true)
    ),

  async execute(interaction) {
    const config = getConfig();

    const isStaff =
      (config.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId)) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Solo lo staff può aggiungere utenti ai ticket!',
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

    await interaction.channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true
    });

    await interaction.reply({
      content: `✅ ${target} è stato aggiunto al ticket da ${interaction.user}.`
    });
  }
};
