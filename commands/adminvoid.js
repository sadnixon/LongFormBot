'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminvoid')
  .setDescription('Fully void a game')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Void type')
      .setRequired(true)
      .addChoices(
        {
          name: 'Current Game',
          value: 'game',
        },
        {
          name: 'Player Channels',
          value: 'channels',
        },
        {
          name: 'Game Channels',
          value: 'admin_channels',
        },
        {
          name: 'Signups',
          value: 'signups',
        },
        {
          name: 'Timers',
          value: 'timers',
        },
        {
          name: 'Phase Change',
          value: 'phase',
        },
        {
          name: 'Special',
          value: 'special',
        },
      ),
  );

async function execute(interaction, user) {
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const voidType = interaction.options.getString('type');

  if (voidType === 'game') {
    await gameInfo.set('gameState', {});
    await gameInfo.set('players', []);
    await gameInfo.set('readyPlayers', []);
    await gameInfo.set('inPlay', false);
    await gameInfo.set('inReady', false);
    await schedDB.clear();
  } else if (voidType === 'channels') {
    await gameInfo.set('player_channels', {});
  } else if (voidType === 'game_channels') {
    await gameInfo.set('game_channels', {});
  } else if (voidType === 'signups') {
    await gameInfo.set('players', []);
    await gameInfo.set('readyPlayers', []);
    await gameInfo.set('inPlay', false);
    await gameInfo.set('inReady', false);
  } else if (voidType === 'phase') {
    const gameState = await gameInfo.get('gameState');
    gameState.currentState = 'voteWait';
    gameState.passedMissions = [];
    await gameInfo.set('gameState', gameState);
    await schedDB.clear();
  } else if (voidType === 'special') {
    const gameState = await gameInfo.get('gameState');
    gameState.refClaims = {};
    gameState.missionResults = [
      { result: 'succeed', fails: 0 },
      { result: 'fail', fails: 1 },
      { result: 'fail', fails: 3 },
      { result: 'succeed', fails: 0 },
      { result: 'fail', fails: 1 },
      { result: 'succeed', fails: 0 },
      { result: 'succeed', fails: 0 }
    ];
    gameState.currentState === 'assassinWait';
    gameState.assassinShot = [];
    await gameInfo.set('gameState', gameState);
  } else if (voidType === 'timers') {
    await schedDB.clear();
    const gameState = await gameInfo.get('gameState');
    gameState.phaseTimers = [];
    await gameInfo.set('gameState', gameState);
  }

  await interaction.reply({
    content: `${voidType.toUpperCase()} is now VOIDED.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
