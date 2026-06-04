const { getConfig } = require('./config');

/**
 * Genera la transcript testuale di un canale ticket
 */
async function generateTranscript(channel) {
  const messages = [];
  let lastId;

  // Recupera tutti i messaggi del canale
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const fetched = await channel.messages.fetch(options);
    if (fetched.size === 0) break;

    messages.push(...fetched.values());
    lastId = fetched.last().id;

    if (fetched.size < 100) break;
  }

  // Ordina dal più vecchio al più recente
  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const config = getConfig();
  const ticketData = config.openTickets[channel.id] || config.closedTickets[channel.id] || {};

  const lines = [];
  lines.push('═══════════════════════════════════════════════════');
  lines.push('              TRANSCRIPT TICKET');
  lines.push('═══════════════════════════════════════════════════');
  lines.push(`Canale:     ${channel.name}`);
  lines.push(`ID Canale:  ${channel.id}`);
  lines.push(`Aperto da:  ${ticketData.openerTag || 'Sconosciuto'}`);
  lines.push(`Tipo:       ${ticketData.type || 'N/A'}`);
  lines.push(`Priorità:   ${ticketData.priority || 'Non impostata'}`);
  lines.push(`Claimato da:${ticketData.claimedBy || 'Nessuno'}`);
  lines.push(`Data:       ${new Date().toLocaleString('it-IT')}`);
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');
  lines.push('MESSAGGI:');
  lines.push('─────────────────────────────────────────────────');
  lines.push('');

  for (const msg of messages) {
    if (msg.author.bot && msg.embeds.length > 0) {
      // Messaggi embed del bot
      const embed = msg.embeds[0];
      const timestamp = msg.createdAt.toLocaleString('it-IT');
      lines.push(`[${timestamp}] [BOT] ${msg.author.tag}`);
      if (embed.title) lines.push(`  📌 ${embed.title}`);
      if (embed.description) lines.push(`  ${embed.description}`);
      if (embed.fields?.length) {
        for (const field of embed.fields) {
          lines.push(`  • ${field.name}: ${field.value}`);
        }
      }
    } else {
      const timestamp = msg.createdAt.toLocaleString('it-IT');
      const content = msg.content || '[Nessun testo]';
      lines.push(`[${timestamp}] ${msg.author.tag}: ${content}`);
      if (msg.attachments.size > 0) {
        for (const att of msg.attachments.values()) {
          lines.push(`  📎 Allegato: ${att.url}`);
        }
      }
    }
  }

  lines.push('');
  lines.push('─────────────────────────────────────────────────');
  lines.push(`Totale messaggi: ${messages.length}`);
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}

module.exports = { generateTranscript };
