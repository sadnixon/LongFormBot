'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed, sendGameState } = require('../message-helpers');
const { clearTasks, scheduleInXHours } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('proxyref')
  .setDescription('Pick your Ref of the Rain target')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The player you are acting for')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('player')
      .setDescription('The player whose team you want to investigate')
      .setRequired(true),
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
  let gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');

  const playerIndex = gameState.players.map((e) => e.id).indexOf(userId);
  const puppeteerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(interaction.user.id);
  if (
    !currentPlayers.includes(userId) ||
    !(
      (['Mordred', 'Witch', 'Morgana', 'Assassin'].includes(
        gameState.players[puppeteerIndex]?.role,
      ) &&
        ['Mordred', 'Witch', 'Morgana', 'Assassin'].includes(
          gameState.players[playerIndex]?.role,
        )) ||
      user.isAuthorized
    )
  ) {
    return interaction.reply({
      content: `You can't proxy act like that!`,
      ephemeral: true,
    });
  }

  if (
    !gameOngoing ||
    gameState.currentState !== 'refWait' ||
    gameState.refChain.at(-1) !== userId
  ) {
    return interaction.reply({
      content: `It's not time for you to play the Ref of the Rain!`,
      ephemeral: true,
    });
  }

  const targetPlayer = interaction.options.getUser(`player`).id;
  if (gameState.refChain.includes(targetPlayer)) {
    return interaction.reply({
      content: `This is not a valid player to use Ref of the Rain on! You must choose a player in the game who is not already in the Ref chain!`,
      ephemeral: true,
    });
  }

  await clearTasks();
  gameState = await gameInfo.get('gameState');
  gameState.refChain.push(targetPlayer);
  gameState.currentState = 'pickWait';
  const nextUpIndex =
    gameState.players
      .map((e) => e.id)
      .indexOf(gameState.missionPickers[gameState.missionIndex - 1].at(-1)) + 1;
  const basePickCount = gameState.players.length > 14 ? 4 : 3;
  for (let i = 0; i < basePickCount + gameState.missionFails; i++) {
    gameState.missionPickers[gameState.missionIndex].push(
      gameState.players[(nextUpIndex + i) % gameState.players.length].id,
    );
  }

  await gameInfo.set('gameState', gameState);
  await interaction.reply({
    content: `You made a Ref of the Rain pick!`,
    ephemeral: true,
  });

  const gameChannels = await gameInfo.get('game_channels');
  const playerChannels = await gameInfo.get('player_channels');
  const playerChannel = await interaction.guild.channels.fetch(
    playerChannels[userId].channelId,
  );
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const announceChannel = await interaction.guild.channels.fetch(
    gameChannels['announcements'].channelId,
  );

  const targetPlayerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(targetPlayer);
  const targetTeam = gameState.players[targetPlayerIndex].team;

  await playerChannel.send(
    standardEmbed(
      'The Ref of the Rain reveals to you the following information:',
      `<@${targetPlayer}> is on the ${targetTeam} team!\nYou can claim what you saw using /claim.`,
    ),
  );
  await announceChannel.send(
    standardEmbed(
      'The Ref of the Rain has been used!',
      `<@${userId}> used the card on <@${targetPlayer}> and learned their team.`,
    ),
  );
  await sendGameState(interaction.client);
  await genChannel.send(
    `${gameState.missionPickers[gameState.missionIndex].map((e) => `<@${e}>`).join(', ')}, it is time to pick a mission using /pick.`,
  );
  await scheduleInXHours('end_pick', {}, 16);
  await scheduleInXHours('end_vote', {}, 18);
}

module.exports = {
  data,
  execute,
};
