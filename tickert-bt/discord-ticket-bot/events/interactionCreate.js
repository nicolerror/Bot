const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  AttachmentBuilder
} = require('discord.js');
const { getConfig, updateConfig } = require('../utils/config');
const { generateTranscript } = require('../utils/transcript');
const fs = require('fs');
const path = require('path');

// Mappa tipo → emoji
const TYPE_EMOJI = {
  supporto: '🛠️',
  acquisti: '🛒',
  partnership: '🤝',
  segnalazioni: '🚨',
  candidature: '📋',
  altro: '📦'
};

const PRIORITY_DATA = {
  low: { label: 'Bassa', emoji: '🟢', color: 0x57f287 },
  medium: { label: 'Media', emoji: '🟡', color: 0xfee75c },
  high: { label: 'Alta', emoji: '🔴', color: 0xed4245 }
};

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // ── SLASH COMMANDS ──────────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction, client);
        return;
      }

      // ── SELECT MENU: scelta tipo ticket ─────────────────────────
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type_select') {
        const config = getConfig();
        const type = interaction.values[0];
        const emoji = TYPE_EMOJI[type] || '📦';

        // ── Controllo ticket duplicato ──────────────────────────────
        const allowMultiple = process.env.ALLOW_MULTIPLE_TICKETS === 'true';
        if (!allowMultiple) {
          const existingTicket = Object.values(config.openTickets || {}).find(
            t => t.openerId === interaction.user.id
          );
          if (existingTicket) {
            const existingChannel = interaction.guild.channels.cache.get(existingTicket.channelId);
            return interaction.reply({
              content: existingChannel
                ? `❌ Hai già un ticket aperto: ${existingChannel}\nChiudilo prima di aprirne uno nuovo.`
                : '❌ Hai già un ticket aperto. Chiudilo prima di aprirne uno nuovo.',
              ephemeral: true
            });
          }
        }

        // Crea il canale ticket
        const guild = interaction.guild;
        let category = null;
        if (config.ticketCategoryId) {
          category = guild.channels.cache.get(config.ticketCategoryId);
        }

        config.ticketCounter = (config.ticketCounter || 0) + 1;
        const ticketNumber = String(config.ticketCounter).padStart(4, '0');
        const channelName = `ticket-${ticketNumber}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        const staffRole = config.staffRoleId ? guild.roles.cache.get(config.staffRoleId) : null;

        const permissionOverwrites = [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles
            ]
          }
        ];

        if (staffRole) {
          permissionOverwrites.push({
            id: staffRole.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ManageMessages
            ]
          });
        }

        const ticketChannel = await guild.channels.create({
          name: channelName,
          parent: category || null,
          permissionOverwrites
        });

        // Salva ticket in config
        const ticketData = {
          channelId: ticketChannel.id,
          openerId: interaction.user.id,
          openerTag: interaction.user.tag,
          type: type.charAt(0).toUpperCase() + type.slice(1),
          priority: null,
          claimedBy: null,
          claimedById: null,
          openedAt: new Date().toISOString()
        };

        const openTickets = config.openTickets || {};
        openTickets[ticketChannel.id] = ticketData;
        updateConfig({ ticketCounter: config.ticketCounter, openTickets });

        // Embed di apertura nel canale ticket
        const openEmbed = new EmbedBuilder()
          .setTitle(`${emoji} Ticket #${ticketNumber} — ${type.charAt(0).toUpperCase() + type.slice(1)}`)
          .setDescription(
            `Ciao ${interaction.user}! 👋\nIl tuo ticket è stato aperto con successo.\nUno staff ti risponderà al più presto.\n\n> Descrivi il tuo problema o la tua richiesta qui sotto.`
          )
          .addFields(
            { name: '👤 Aperto da', value: `${interaction.user.tag}`, inline: true },
            { name: `${emoji} Tipo`, value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
            { name: '🎯 Priorità', value: '`Non impostata`', inline: true }
          )
          .setColor(0x5865f2)
          .setFooter({ text: `Ticket #${ticketNumber}` })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Chiudi Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
          content: staffRole ? `${staffRole}` : '',
          embeds: [openEmbed],
          components: [row]
        });

        // Risposta all'utente
        await interaction.reply({
          content: `✅ Ticket aperto! → ${ticketChannel}`,
          ephemeral: true
        });

        // Log
        await sendLog(interaction.guild, config, '🎫 Nuovo Ticket Aperto', [
          { name: '👤 Utente', value: interaction.user.tag, inline: true },
          { name: '📂 Tipo', value: type, inline: true },
          { name: '📌 Canale', value: `${ticketChannel}`, inline: true }
        ], 0x5865f2);

        return;
      }

      // ── BUTTONS ─────────────────────────────────────────────────
      if (interaction.isButton()) {
        const config = getConfig();

        // ── CLAIM ──
        if (interaction.customId === 'ticket_claim') {
          if (!hasStaffRole(interaction.member, config.staffRoleId)) {
            return interaction.reply({ content: '❌ Solo lo staff può claimare i ticket!', ephemeral: true });
          }

          const ticket = config.openTickets?.[interaction.channel.id];
          if (!ticket) return interaction.reply({ content: '❌ Ticket non trovato.', ephemeral: true });

          if (ticket.claimedById) {
            return interaction.reply({
              content: `❌ Questo ticket è già claimato da <@${ticket.claimedById}>!`,
              ephemeral: true
            });
          }

          ticket.claimedBy = interaction.user.tag;
          ticket.claimedById = interaction.user.id;
          config.openTickets[interaction.channel.id] = ticket;
          updateConfig({ openTickets: config.openTickets });

          const claimEmbed = new EmbedBuilder()
            .setDescription(`✋ **${interaction.user.tag}** ha claimato questo ticket.`)
            .setColor(0x57f287)
            .setTimestamp();

          await interaction.reply({ embeds: [claimEmbed] });

          // Aggiorna permessi: solo il claimer e l'opener possono scrivere tra lo staff
          await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          });

          return;
        }

        // ── CLOSE ──
        if (interaction.customId === 'ticket_close') {
          if (!hasStaffRole(interaction.member, config.staffRoleId)) {
            return interaction.reply({ content: '❌ Solo lo staff può chiudere i ticket!', ephemeral: true });
          }

          const ticket = config.openTickets?.[interaction.channel.id];
          if (!ticket) return interaction.reply({ content: '❌ Ticket non trovato.', ephemeral: true });

          await interaction.reply({ content: '🔒 Chiusura ticket in corso...', ephemeral: false });

          // Genera transcript
          const transcriptText = await generateTranscript(interaction.channel);
          const transcriptBuffer = Buffer.from(transcriptText, 'utf-8');
          const attachment = new AttachmentBuilder(transcriptBuffer, {
            name: `transcript-${interaction.channel.name}.txt`
          });

          // Invia transcript in DM all'opener
          try {
            const opener = await interaction.guild.members.fetch(ticket.openerId);
            const dmEmbed = new EmbedBuilder()
              .setTitle('🔒 Il tuo ticket è stato chiuso')
              .setDescription(
                `Il tuo ticket **${interaction.channel.name}** è stato chiuso da **${interaction.user.tag}**.\n\nIn allegato trovi la transcript completa della conversazione.`
              )
              .addFields(
                { name: '📂 Tipo', value: ticket.type || 'N/A', inline: true },
                { name: '🎯 Priorità', value: ticket.priority || 'Non impostata', inline: true },
                { name: '✋ Gestito da', value: ticket.claimedBy || 'Nessuno', inline: true }
              )
              .setColor(0xed4245)
              .setTimestamp();

            await opener.send({ embeds: [dmEmbed], files: [attachment] });

            // Richiedi valutazione in DM
            await sendRatingRequest(opener, interaction, ticket, config);
          } catch (e) {
            console.log('⚠️ Non riesco a inviare DM all\'utente:', e.message);
          }

          // Invia transcript nel canale log transcript se configurato
          if (config.transcriptChannelId) {
            const transcriptCh = interaction.guild.channels.cache.get(config.transcriptChannelId);
            if (transcriptCh) {
              const logAttachment = new AttachmentBuilder(Buffer.from(transcriptText, 'utf-8'), {
                name: `transcript-${interaction.channel.name}.txt`
              });
              const logEmbed = new EmbedBuilder()
                .setTitle(`📄 Transcript: ${interaction.channel.name}`)
                .addFields(
                  { name: '👤 Utente', value: ticket.openerTag, inline: true },
                  { name: '📂 Tipo', value: ticket.type, inline: true },
                  { name: '🔒 Chiuso da', value: interaction.user.tag, inline: true }
                )
                .setColor(0x5865f2)
                .setTimestamp();
              await transcriptCh.send({ embeds: [logEmbed], files: [logAttachment] });
            }
          }

          // Sposta il ticket nei chiusi
          const closed = config.closedTickets || {};
          closed[interaction.channel.id] = {
            ...ticket,
            closedAt: new Date().toISOString(),
            closedBy: interaction.user.tag
          };
          delete config.openTickets[interaction.channel.id];
          updateConfig({ openTickets: config.openTickets, closedTickets: closed });

          // Log
          await sendLog(interaction.guild, config, '🔒 Ticket Chiuso', [
            { name: '📌 Ticket', value: interaction.channel.name, inline: true },
            { name: '👤 Utente', value: ticket.openerTag, inline: true },
            { name: '🔒 Chiuso da', value: interaction.user.tag, inline: true }
          ], 0xed4245);

          // Elimina canale dopo 5 secondi
          setTimeout(async () => {
            try {
              await interaction.channel.delete();
            } catch {}
          }, 5000);

          return;
        }

        // ── RATING BUTTONS (1-5 stelle) ──
        if (interaction.customId.startsWith('rating_')) {
          const parts = interaction.customId.split('_');
          const stars = parseInt(parts[1]);
          const ticketChannelId = parts[2];

          const config = getConfig();
          const ticket = config.closedTickets?.[ticketChannelId];

          const starsDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

          const reviewEmbed = new EmbedBuilder()
            .setTitle('⭐ Nuova Valutazione Ricevuta')
            .addFields(
              { name: '👤 Utente', value: interaction.user.tag, inline: true },
              { name: '🎫 Ticket', value: ticket?.type || 'N/A', inline: true },
              { name: '⭐ Voto', value: `${starsDisplay} (${stars}/5)`, inline: true },
              { name: '✋ Staff', value: ticket?.claimedBy || 'Nessuno', inline: true }
            )
            .setColor(stars >= 4 ? 0x57f287 : stars >= 3 ? 0xfee75c : 0xed4245)
            .setTimestamp();

          // Invia nel canale review
          if (config.reviewChannelId) {
            const reviewChannel = interaction.guild?.channels.cache.get(config.reviewChannelId)
              || client.channels.cache.get(config.reviewChannelId);
            if (reviewChannel) {
              await reviewChannel.send({ embeds: [reviewEmbed] });
            }
          }

          await interaction.update({
            content: `✅ Grazie per la tua valutazione: **${starsDisplay}**`,
            components: [],
            embeds: []
          });

          return;
        }
      }

    } catch (err) {
      console.error('❌ Errore in interactionCreate:', err);
      try {
        const msg = { content: '❌ Si è verificato un errore.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      } catch {}
    }
  }
};

// ── HELPERS ─────────────────────────────────────────────────────

function hasStaffRole(member, staffRoleId) {
  if (!staffRoleId) return member.permissions.has(PermissionFlagsBits.Administrator);
  return member.roles.cache.has(staffRoleId) || member.permissions.has(PermissionFlagsBits.Administrator);
}

async function sendLog(guild, config, title, fields, color) {
  if (!config.logChannelId) return;
  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(fields)
    .setColor(color)
    .setTimestamp();
  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

async function sendRatingRequest(member, interaction, ticket, config) {
  const ratingEmbed = new EmbedBuilder()
    .setTitle('⭐ Valuta il supporto ricevuto')
    .setDescription(
      'Come valuti il supporto che ti è stato fornito?\nClicca su una delle stelle qui sotto!'
    )
    .setColor(0xfee75c);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rating_1_${interaction.channel.id}`)
      .setLabel('1 ⭐')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rating_2_${interaction.channel.id}`)
      .setLabel('2 ⭐')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rating_3_${interaction.channel.id}`)
      .setLabel('3 ⭐')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`rating_4_${interaction.channel.id}`)
      .setLabel('4 ⭐')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`rating_5_${interaction.channel.id}`)
      .setLabel('5 ⭐')
      .setStyle(ButtonStyle.Success)
  );

  await member.send({ embeds: [ratingEmbed], components: [row] }).catch(() => {});
}
