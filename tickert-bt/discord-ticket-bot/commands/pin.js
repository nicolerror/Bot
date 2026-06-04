const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { getConfig, updateConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pin')
    .setDescription('🔐 Imposta o rimuovi un PIN sul ticket (solo staff)')
    .addSubcommand(sub =>
      sub.setName('imposta')
        .setDescription("Imposta un PIN sul ticket — l'utente dovrà inserirlo per poter scrivere")
        .addStringOption(opt =>
          opt.setName('codice')
            .setDescription('Il PIN da impostare (es. 1234)')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(20)
        )
    )
    .addSubcommand(sub =>
      sub.setName('rimuovi')
        .setDescription('Rimuovi il PIN dal ticket')
    ),

  async execute(interaction) {
    const config = getConfig();

    // Controllo ruolo staff
    const isStaff =
      (config.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId)) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Solo lo staff può usare questo comando!',
        ephemeral: true
      });
    }

    // Verifica che sia un ticket aperto
    const ticket = config.openTickets?.[interaction.channel.id];
    if (!ticket) {
      return interaction.reply({
        content: '❌ Questo comando può essere usato solo in un canale ticket aperto!',
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    // ── IMPOSTA PIN ───────────────────────────────────────────────
    if (sub === 'imposta') {
      const codice = interaction.options.getString('codice');

      ticket.pin = codice;
      ticket.pinVerified = [];
      config.openTickets[interaction.channel.id] = ticket;
      updateConfig({ openTickets: config.openTickets });

      // Rimuovi permesso di scrittura all'opener
      try {
        await interaction.channel.permissionOverwrites.edit(ticket.openerId, {
          ViewChannel: true,
          SendMessages: false,
          ReadMessageHistory: true,
          AttachFiles: false
        });
      } catch {}

      // Embed privato allo staff con il PIN
      await interaction.reply({
        content: `✅ PIN impostato: \`${codice}\` — comunicalo all'utente come preferisci.`,
        ephemeral: true
      });

      // Avviso pubblico nel canale
      const avvisoEmbed = new EmbedBuilder()
        .setTitle('🔐 Ticket Protetto da PIN')
        .setDescription(
          `<@${ticket.openerId}>, questo ticket è stato protetto da PIN da **${interaction.user.tag}**.\n\n` +
          `Per poter scrivere in questo ticket, invia il PIN corretto qui nel canale.\n` +
          `> Contatta lo staff per ricevere il PIN.`
        )
        .setColor(0xfee75c)
        .setTimestamp();

      await interaction.channel.send({ embeds: [avvisoEmbed] });
    }

    // ── RIMUOVI PIN ───────────────────────────────────────────────
    if (sub === 'rimuovi') {
      if (!ticket.pin) {
        return interaction.reply({
          content: '❌ Questo ticket non ha nessun PIN impostato.',
          ephemeral: true
        });
      }

      delete ticket.pin;
      delete ticket.pinVerified;
      config.openTickets[interaction.channel.id] = ticket;
      updateConfig({ openTickets: config.openTickets });

      // Ripristina permessi scrittura
      try {
        await interaction.channel.permissionOverwrites.edit(ticket.openerId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true
        });
      } catch {}

      const embed = new EmbedBuilder()
        .setDescription(`✅ PIN rimosso da **${interaction.user.tag}**. L'utente può ora scrivere liberamente.`)
        .setColor(0x57f287)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};
