'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed, sendGameState, endGame } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('proxywitch')
  .setDescription('Pick your assassination target')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The player you are acting for')
      .setRequired(true),
  )
  .addUserOption((option) =>
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
  const userId = interaction.options.getUser(`user`).id;

  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
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

  const playerIndex = gameState.players.map((e) => e.id).indexOf(userId);
  const puppeteerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(interaction.user.id);
  if (
    !currentPlayers.includes(userId) ||
    !(
      ['Mordred', 'Assassin', 'Morgana'].includes(
        gameState.players[puppeteerIndex].role,
      ) || user.isAuthorized
    )
  ) {
    return interaction.reply({
      content: `You can't proxy act like that!`,
      ephemeral: true,
    });
  }

  const targetPlayer = interaction.options.getUser(`player`);
  const targetRole = interaction.options.getString(`role`);
  const targetPlayerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(targetPlayer.id);

  if (
    !currentPlayers.includes(targetPlayer.id) ||
    ['Assassin', 'Morgana', 'Mordred', 'Witch'].includes(
      gameState.players[targetPlayerIndex]?.role,
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

  gameState.witchCurses[targetPlayer.id] = {
    id: targetPlayer.id,
    role: targetRole,
    triggered: false,
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
      `<@${userId}> Witch guessed <@${targetPlayer.id}> as ${targetRole.toUpperCase()}!`,
    ),
  );
}

module.exports = {
  data,
  execute,
};
