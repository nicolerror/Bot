const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { getConfig, updateConfig } = require('../utils/config');

const PRIORITY_DATA = {
  low:    { label: 'Bassa',  emoji: '🟢', color: 0x57f287 },
  medium: { label: 'Media',  emoji: '🟡', color: 0xfee75c },
  high:   { label: 'Alta',   emoji: '🔴', color: 0xed4245 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('🎯 Imposta la priorità di un ticket (solo staff)')
    .addStringOption(opt =>
      opt.setName('livello')
        .setDescription('Livello di priorità')
        .setRequired(true)
        .addChoices(
          { name: '🟢 Bassa (Low)',   value: 'low' },
          { name: '🟡 Media (Medium)', value: 'medium' },
          { name: '🔴 Alta (High)',    value: 'high' }
        )
    ),

  async execute(interaction) {
    const config = getConfig();

    // Controllo ruolo staff
    const isStaff =
      (config.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId)) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Solo lo staff può impostare la priorità dei ticket!',
        ephemeral: true
      });
    }

    // Verifica che il canale sia un ticket aperto
    const ticket = config.openTickets?.[interaction.channel.id];
    if (!ticket) {
      return interaction.reply({
        content: '❌ Questo comando può essere usato solo in un canale ticket aperto!',
        ephemeral: true
      });
    }

    const level = interaction.options.getString('livello');
    const pData = PRIORITY_DATA[level];

    // Aggiorna la priorità
    ticket.priority = pData.label;
    config.openTickets[interaction.channel.id] = ticket;
    updateConfig({ openTickets: config.openTickets });

    const embed = new EmbedBuilder()
      .setDescription(
        `${pData.emoji} La priorità di questo ticket è stata impostata a **${pData.label}** da ${interaction.user}.`
      )
      .setColor(pData.color)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Aggiorna il nome del canale con la priorità
    try {
      const currentName = interaction.channel.name;
      // Rimuovi eventuali prefissi di priorità precedenti
      const cleanName = currentName
        .replace(/^🟢-|^🟡-|^🔴-/u, '')
        .replace(/^\[low\]-|^\[medium\]-|^\[high\]-/i, '');

      const emojiPrefix = level === 'low' ? '🟢' : level === 'medium' ? '🟡' : '🔴';
      // Discord non supporta emoji nei nomi canale via API, uso testo
      const prefixText = level === 'low' ? 'low' : level === 'medium' ? 'med' : 'high';
      await interaction.channel.setName(`[${prefixText}]-${cleanName}`);
    } catch {
      // Ignora errori nel rinominare (rate limit, permessi, ecc.)
    }
  }
};
