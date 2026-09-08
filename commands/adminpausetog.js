'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminpausetog')
  .setDescription('Pause or unpause a game');

async function execute(interaction, user) {
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  if (!gameOngoing) {
    return interaction.reply({
      content: 'This command must be used during an ongoing game.',
      ephemeral: true,
    });
  }
  const gameState = await gameInfo.get('gameState');

  if (gameState.pausedState == null) {
    gameState.pausedState = gameState.currentState;
    gameState.currentState = 'adminPaused';
    await gameInfo.set('gameState', gameState);

    await interaction.reply({
      content: `The game is now PAUSED.`,
      ephemeral: true,
    });
  } else {
    gameState.currentState = gameState.pausedState;
    gameState.pausedState = null;
    await gameInfo.set('gameState', gameState);

    await interaction.reply({
      content: `The game is now UNPAUSED.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
