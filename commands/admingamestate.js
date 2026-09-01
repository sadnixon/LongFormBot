'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { sendGameState } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('admingamestate')
  .setDescription('Check on the current game state with roles revealed');

async function execute(interaction, user) {
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  if (!gameOngoing) {
    return interaction.reply({
      content: 'This command can only be used during an ongoing game.',
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: "Here's the current game state!",
    ephemeral: true,
  });
  await sendGameState(interaction.client, 'current',true,'none',interaction);
}

module.exports = {
  data,
  execute,
};
