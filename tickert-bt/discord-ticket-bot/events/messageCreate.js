const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, updateConfig } = require('../utils/config');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignora bot e DM
    if (message.author.bot) return;
    if (!message.guild) return;

    const config = getConfig();
    const ticket = config.openTickets?.[message.channel.id];

    // Non è un canale ticket o non ha PIN
    if (!ticket || !ticket.pin) return;

    // Lo staff bypassa sempre il PIN
    const member = message.member;
    const isStaff =
      (config.staffRoleId && member.roles.cache.has(config.staffRoleId)) ||
      member.permissions.has(PermissionFlagsBits.Administrator);
    if (isStaff) return;

    // L'utente ha già verificato il PIN
    const verified = ticket.pinVerified || [];
    if (verified.includes(message.author.id)) return;

    // Cancella il messaggio e controlla il PIN
    try {
      await message.delete();
    } catch {}

    if (message.content.trim() === ticket.pin) {
      // PIN corretto — sblocca la scrittura
      ticket.pinVerified = [...verified, message.author.id];
      config.openTickets[message.channel.id] = ticket;
      updateConfig({ openTickets: config.openTickets });

      try {
        await message.channel.permissionOverwrites.edit(message.author.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true
        });
      } catch {}

      const okEmbed = new EmbedBuilder()
        .setDescription(`✅ <@${message.author.id}> PIN corretto! Ora puoi scrivere liberamente nel ticket.`)
        .setColor(0x57f287)
        .setTimestamp();

      const sent = await message.channel.send({ embeds: [okEmbed] });
      setTimeout(() => sent.delete().catch(() => {}), 5000);

    } else {
      // PIN errato
      const errEmbed = new EmbedBuilder()
        .setDescription(`❌ <@${message.author.id}> PIN errato. Riprova.`)
        .setColor(0xed4245)
        .setTimestamp();

      const sent = await message.channel.send({ embeds: [errEmbed] });
      setTimeout(() => sent.delete().catch(() => {}), 4000);
    }
  }
};
