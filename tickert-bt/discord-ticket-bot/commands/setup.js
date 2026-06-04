const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { getConfig, updateConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('⚙️ Configura il bot ticket (solo amministratori)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── Sottocomandi ──
    .addSubcommand(sub =>
      sub.setName('panel')
        .setDescription('📤 Invia il pannello di apertura ticket in un canale')
        .addChannelOption(opt =>
          opt.setName('canale')
            .setDescription('Canale dove inviare il pannello ticket')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('categoria')
        .setDescription('📁 Imposta la categoria dove vengono creati i ticket')
        .addChannelOption(opt =>
          opt.setName('categoria')
            .setDescription('Categoria Discord')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('log')
        .setDescription('📋 Imposta il canale dei log')
        .addChannelOption(opt =>
          opt.setName('canale')
            .setDescription('Canale log')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('recensioni')
        .setDescription('⭐ Imposta il canale dove vengono inviate le valutazioni')
        .addChannelOption(opt =>
          opt.setName('canale')
            .setDescription('Canale recensioni')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('transcript')
        .setDescription('📄 Imposta il canale dove vengono salvate le transcript')
        .addChannelOption(opt =>
          opt.setName('canale')
            .setDescription('Canale transcript')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('staffrole')
        .setDescription('👮 Imposta il ruolo Staff')
        .addRoleOption(opt =>
          opt.setName('ruolo')
            .setDescription('Ruolo da assegnare allo staff')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('ℹ️ Visualizza la configurazione attuale')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const config = getConfig();

    // ── PANEL ──────────────────────────────────────────────────────
    if (sub === 'panel') {
      const channel = interaction.options.getChannel('canale');

      const embed = new EmbedBuilder()
        .setTitle('🎫 Apri un Ticket')
        .setDescription(
          '**Benvenuto nel sistema di supporto!**\n\n' +
          'Seleziona la categoria del tuo ticket dal menù qui sotto.\n' +
          'Il nostro staff ti risponderà al più presto.\n\n' +
          '> 🛠️ **Supporto** — Problemi tecnici o assistenza\n' +
          '> 🛒 **Acquisti** — Ordini, pagamenti, rimborsi\n' +
          '> 🤝 **Partnership** — Proposte di collaborazione\n' +
          '> 🚨 **Segnalazioni** — Segnala un utente o un problema\n' +
          '> 📋 **Candidature** — Candidati per entrare nello staff\n' +
          '> 📦 **Altro** — Qualsiasi altra richiesta'
        )
        .setColor(0x5865f2)
        .setFooter({ text: 'Seleziona una categoria per aprire il ticket' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_type_select')
          .setPlaceholder('📂 Seleziona il tipo di ticket...')
          .addOptions([
            { label: 'Supporto', description: 'Assistenza tecnica o problemi', emoji: '🛠️', value: 'supporto' },
            { label: 'Acquisti', description: 'Ordini, pagamenti e rimborsi', emoji: '🛒', value: 'acquisti' },
            { label: 'Partnership', description: 'Proposte di collaborazione', emoji: '🤝', value: 'partnership' },
            { label: 'Segnalazioni', description: 'Segnala un problema o utente', emoji: '🚨', value: 'segnalazioni' },
            { label: 'Candidature', description: 'Candidati come staff', emoji: '📋', value: 'candidature' },
            { label: 'Altro', description: 'Qualsiasi altra richiesta', emoji: '📦', value: 'altro' }
          ])
      );

      await channel.send({ embeds: [embed], components: [row] });
      updateConfig({ ticketPanelChannelId: channel.id });

      return interaction.editReply({ content: `✅ Pannello ticket inviato in ${channel}!` });
    }

    // ── CATEGORIA ──────────────────────────────────────────────────
    if (sub === 'categoria') {
      const cat = interaction.options.getChannel('categoria');
      updateConfig({ ticketCategoryId: cat.id });
      return interaction.editReply({ content: `✅ Categoria ticket impostata: **${cat.name}**` });
    }

    // ── LOG ────────────────────────────────────────────────────────
    if (sub === 'log') {
      const ch = interaction.options.getChannel('canale');
      updateConfig({ logChannelId: ch.id });
      return interaction.editReply({ content: `✅ Canale log impostato: ${ch}` });
    }

    // ── RECENSIONI ─────────────────────────────────────────────────
    if (sub === 'recensioni') {
      const ch = interaction.options.getChannel('canale');
      updateConfig({ reviewChannelId: ch.id });
      return interaction.editReply({ content: `✅ Canale recensioni impostato: ${ch}` });
    }

    // ── TRANSCRIPT ─────────────────────────────────────────────────
    if (sub === 'transcript') {
      const ch = interaction.options.getChannel('canale');
      updateConfig({ transcriptChannelId: ch.id });
      return interaction.editReply({ content: `✅ Canale transcript impostato: ${ch}` });
    }

    // ── STAFF ROLE ─────────────────────────────────────────────────
    if (sub === 'staffrole') {
      const role = interaction.options.getRole('ruolo');
      updateConfig({ staffRoleId: role.id });
      return interaction.editReply({ content: `✅ Ruolo staff impostato: **${role.name}** (${role.id})` });
    }

    // ── INFO ───────────────────────────────────────────────────────
    if (sub === 'info') {
      const c = getConfig();
      const guild = interaction.guild;

      const resolve = (id, type = 'channel') => {
        if (!id) return '`Non configurato`';
        if (type === 'channel') {
          const ch = guild.channels.cache.get(id);
          return ch ? `${ch} (\`${id}\`)` : `\`${id}\` (non trovato)`;
        }
        if (type === 'role') {
          const r = guild.roles.cache.get(id);
          return r ? `**${r.name}** (\`${id}\`)` : `\`${id}\` (non trovato)`;
        }
        if (type === 'category') {
          const cat = guild.channels.cache.get(id);
          return cat ? `📁 **${cat.name}** (\`${id}\`)` : `\`${id}\` (non trovato)`;
        }
      };

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Configurazione Bot Ticket')
        .addFields(
          { name: '📁 Categoria ticket', value: resolve(c.ticketCategoryId, 'category'), inline: false },
          { name: '📋 Canale log', value: resolve(c.logChannelId), inline: true },
          { name: '⭐ Canale recensioni', value: resolve(c.reviewChannelId), inline: true },
          { name: '📄 Canale transcript', value: resolve(c.transcriptChannelId), inline: true },
          { name: '👮 Ruolo Staff', value: resolve(c.staffRoleId, 'role'), inline: true },
          { name: '🎫 Ticket totali', value: `\`${c.ticketCounter || 0}\``, inline: true },
          { name: '🟢 Ticket aperti', value: `\`${Object.keys(c.openTickets || {}).length}\``, inline: true }
        )
        .setColor(0x5865f2)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
