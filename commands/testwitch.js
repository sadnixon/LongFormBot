'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed, sendGameState, endGame } = require('../message-helpers');

const idChoice = (id) => {
  return {
    name: id,
    value: id,
  };
};

const data = new SlashCommandBuilder()
  .setName('testwitch')
  .setDescription('Pick your assassination target')
  .addStringOption((option) =>
    option
      .setName('playerid')
      .setDescription('Player ID')
      .setRequired(true)
      .addChoices(
        idChoice('0'),
        idChoice('100'),
        idChoice('200'),
        idChoice('300'),
        idChoice('400'),
        idChoice('500'),
        idChoice('600'),
        idChoice('700'),
        idChoice('800'),
        idChoice('900'),
        idChoice('1000'),
        idChoice('1100'),
        idChoice('1200'),
      ),
  )
  .addStringOption((option) =>
    option
      .setName('player')
      .setDescription('The player who you want to witch guess')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('role')
      .setDescription('The role you want to guess your target as')
      .setRequired(true)
      .addChoices(
        {
          name: 'Percival',
          value: 'percival',
        },
        {
          name: 'Tristan/Isolde',
          value: 'lover',
        },
      ),
  );

async function execute(interaction, user) {
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const userId = interaction.options.getString('playerid');
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  const playerIndex = gameState.players.map((e) => e.id).indexOf(userId);
  if (
    !gameOngoing ||
    !currentPlayers.includes(userId) ||
    gameState.players[playerIndex].role !== 'Witch' ||
    gameState.missionFails > 2
  ) {
    return interaction.reply({
      content: `It's not time for you to make a witch guess!`,
      ephemeral: true,
    });
  }

  const targetPlayer = interaction.options.getString(`player`);
  const targetRole = interaction.options.getString(`role`);
  const targetPlayerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(targetPlayer);

  if (
    !currentPlayers.includes(targetPlayer) ||
    ['Assassin', 'Morgana', 'Mordred', 'Witch'].includes(
      gameState.players[targetPlayerIndex].role,
    ) ||
    (gameState.witchResults.length > 0 && gameState.witchResults[0].success) ||
    Object.keys(gameState.witchCurses).length > 1 ||
    (Object.keys(gameState.witchCurses).length === 1 &&
      ((Object.values(gameState.witchCurses)[0].role === targetRole &&
        targetRole === 'percival') ||
        targetPlayer in gameState.witchCurses))
  ) {
    return interaction.reply({
      content: `This is not a valid witch guess! You must choose a non-spy player in the current game (you cannot guess the same player twice, or the same role twice, or guess more than twice).`,
      ephemeral: true,
    });
  }

  gameState.witchCurses[targetPlayer] = {
    id: targetPlayer,
    role: targetRole,
    triggered: false,
    index: Object.keys(gameState.witchCurses).length,
  };

  await gameInfo.set('gameState', gameState);

  await interaction.reply({
    content: `You made a witch guess!`,
    ephemeral: true,
  });

  const gameChannels = await gameInfo.get('game_channels');
  const spyChannel = await interaction.guild.channels.fetch(
    gameChannels['spies'].channelId,
  );

  await spyChannel.send(
    standardEmbed(
      'A Witch guess was made!',
      `<@${userId}> Witch guessed <@${targetPlayer}> as ${targetRole.toUpperCase()}!`,
    ),
  );
}

module.exports = {
  data,
  execute,
};
