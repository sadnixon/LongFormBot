'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('regged')
  .setDescription('See regged users');

async function execute(interaction, user) {
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const playerChannels = await gameInfo.get('player_channels');
  await interaction.reply({
    content: `**Users With /reg'd Channels:**\n\n${Object.keys(playerChannels)
      .map((e) => `<@${e}>`)
      .join(', ')}`,
    ephemeral: false,
  });
}

module.exports = {
  data,
  execute,
};
