const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { getConfig } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soluzione')
    .setDescription('🤖 Chiedi a Groq AI come risolvere il problema del ticket (risposta in DM, solo staff)'),

  async execute(interaction) {
    const config = getConfig();

    // ── Controllo ruolo staff ──────────────────────────────────────
    const isStaff =
      (config.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId)) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
      return interaction.reply({
        content: '❌ Solo lo staff può usare questo comando!',
        ephemeral: true
      });
    }

    // ── Verifica che sia un ticket aperto ─────────────────────────
    const ticket = config.openTickets?.[interaction.channel.id];
    if (!ticket) {
      return interaction.reply({
        content: '❌ Questo comando può essere usato solo in un canale ticket aperto!',
        ephemeral: true
      });
    }

    // ── Verifica API key ──────────────────────────────────────────
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'LA_TUA_GROQ_API_KEY_QUI') {
      return interaction.reply({
        content: '❌ `GROQ_API_KEY` non configurata nel file `.env`!\nOttienila gratis su: https://console.groq.com/',
        ephemeral: true
      });
    }

    await interaction.reply({
      content: '🤖 Sto analizzando il ticket con Groq AI... Riceverai la risposta in DM tra pochi secondi.',
      ephemeral: true
    });

    // ── Recupera i messaggi del canale ────────────────────────────
    const messages = [];
    let lastId;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const fetched = await interaction.channel.messages.fetch(options);
      if (fetched.size === 0) break;
      messages.push(...fetched.values());
      lastId = fetched.last().id;
      if (fetched.size < 100) break;
    }

    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Costruisce la conversazione in formato testo, escludendo bot puri
    const conversazione = messages
      .filter(m => !m.author.bot || m.content)
      .map(m => {
        const autore = m.author.bot ? '[BOT]' : m.author.tag;
        const testo = m.content || (m.embeds[0]?.description ?? '');
        return testo ? `${autore}: ${testo}` : null;
      })
      .filter(Boolean)
      .join('\n');

    if (!conversazione.trim()) {
      return interaction.followUp({
        content: '⚠️ Non ci sono abbastanza messaggi nel ticket per analizzarlo.',
        ephemeral: true
      });
    }

    // ── Prompt ────────────────────────────────────────────────────
    const prompt = `Sei un assistente esperto per lo staff di un server Discord. Analizza la seguente conversazione di un ticket di supporto e fornisci allo staff una guida dettagliata su come aiutare l'utente.

Informazioni ticket:
- Tipo: ${ticket.type || 'N/A'}
- Priorità: ${ticket.priority || 'Non impostata'}
- Aperto da: ${ticket.openerTag}

Conversazione del ticket:
---
${conversazione}
---

Rispondi in italiano con:
1. **Riepilogo del problema** — cosa sta chiedendo/segnalando l'utente in 2-3 righe
2. **Soluzione consigliata** — passi concreti che lo staff dovrebbe seguire per risolvere
3. **Messaggio suggerito** — un esempio di risposta che lo staff può inviare all'utente nel ticket
4. **Note aggiuntive** — eventuali avvertenze o situazioni da tenere a mente

Sii diretto, pratico e professionale.`;

    // ── Chiamata all'API Groq ─────────────────────────────────────
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Groq API error ${res.status}: ${errBody}`);
      }

      const data = await res.json();
      const aiText = data?.choices?.[0]?.message?.content;

      if (!aiText) throw new Error('Risposta vuota da Groq.');

      // ── Invia in DM allo staff ────────────────────────────────
      const dmEmbed = new EmbedBuilder()
        .setTitle(`🤖 Analisi Groq AI — ${interaction.channel.name}`)
        .setDescription(aiText.length > 4000 ? aiText.substring(0, 3997) + '...' : aiText)
        .addFields(
          { name: '🎫 Ticket', value: interaction.channel.name, inline: true },
          { name: '📂 Tipo', value: ticket.type || 'N/A', inline: true },
          { name: '👤 Utente', value: ticket.openerTag, inline: true }
        )
        .setColor(0xf55036)
        .setFooter({ text: 'Analisi generata da Groq AI (LLaMA 3) • Solo per uso interno staff' })
        .setTimestamp();

      try {
        await interaction.user.send({ embeds: [dmEmbed] });
      } catch {
        await interaction.followUp({
          content: '⚠️ Non riesco a inviarti il DM. Abilita i messaggi diretti dal server.',
          ephemeral: true
        });
      }

    } catch (err) {
      console.error('❌ Errore Groq API:', err.message);
      await interaction.followUp({
        content: `❌ Errore Groq AI: \`${err.message.substring(0, 1800)}\``,
        ephemeral: true
      });
    }
  }
};
