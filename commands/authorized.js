'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('authorized')
  .setDescription('See authorized users');

async function execute(interaction, user) {
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: `**Authorized Long Form Bot Users:**\n\n<@${[
      ...new Set(await authorizedDataSetters.get('auth')),
    ].join('>, <@')}>`,
    ephemeral: false,
  });
}

module.exports = {
  data,
  execute,
};
