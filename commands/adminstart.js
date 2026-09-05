'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { sendVoteState } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminstart')
  .setDescription('Force start the game');

async function execute(interaction, user) {
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  if (gameOngoing) {
    return interaction.reply({
      content: 'This command cannot be used during an ongoing game.',
      ephemeral: true,
    });
  }
  const currentPlayers = await gameInfo.get('players');
  if (currentPlayers.length >= 13 && currentPlayers.length <= 15) {
    await startGame(interaction);
    await interaction.reply({
      content: 'We starting!',
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: 'We not starting!',
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
