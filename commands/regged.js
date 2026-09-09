'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { standardEmbed } = require('../message-helpers');

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
  for (const player of Object.keys(playerChannels)) {
    try {
      const playerChannel = await interaction.guild.channels.fetch(
        playerChannels[player].channelId,
      );
      await playerChannel.send(
        standardEmbed(
          'Here it is!',
          `This is <@${player}>'s channel for games.`,
        ),
      );
    } catch (error) {
      console.error('Failed to get all channels:', error);
      process.exitCode = 1;
      await interaction.channel.send(`Channel for <@${player}> doesn't exist!`);
    }
  }
}

module.exports = {
  data,
  execute,
};
