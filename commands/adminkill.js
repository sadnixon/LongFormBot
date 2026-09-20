'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminkill')
  .setDescription('Remove one player from the game')
  .addStringOption((option) =>
    option
      .setName('out')
      .setDescription('The user to be removed')
      .setRequired(true),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  let currentPlayers = await gameInfo.get('players');

  const outUser = interaction.options.getUser('out');

  if (!gameOngoing || !currentPlayers.includes(outUser)) {
    return interaction.editReply({
      content: `It's not time for you to remove this user!`,
      ephemeral: true,
    });
  }
  const gameState = await gameInfo.get('gameState');
  const gameChannels = await gameInfo.get('game_channels');
  const playerIndex = gameState.players.map((e) => e.id).indexOf(outUser);

  //GAMESTATE STUFF
  gameState.players = gameState.players.filter((e) => e.id !== outUser);

  for (let i = gameState.missionIndex; i < gameState.missionVotes.length; i++) {
    gameState.missionVotes[i] = gameState.missionVotes[i].filter(
      (e, index) => index !== playerIndex,
    );
  }

  gameState.missionSizes =
    gameState.players.length === 13
      ? [4, 5, 6, 7, 6, 7, 7]
      : gameState.players.length < 17
        ? [4, 5, 6, 7, 7, 8, 8]
        : [5, 6, 7, 8, 8, 9, 9];

  //CURRENT PLAYERS
  const currentPlayerIdx = currentPlayers.indexOf(outUser);
  currentPlayers = currentPlayers.filter((e, i) => i !== currentPlayerIdx);

  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const nongameChannel = await interaction.guild.channels.fetch(
    gameChannels['nongame'].channelId,
  );
  const picksChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const paragraphsChannel = await interaction.guild.channels.fetch(
    gameChannels['paragraphs'].channelId,
  );
  const loversChannel = await interaction.guild.channels.fetch(
    gameChannels['lovers'].channelId,
  );
  const spiesChannel = await interaction.guild.channels.fetch(
    gameChannels['spies'].channelId,
  );

  try {
    await genChannel.permissionOverwrites.edit(outUser, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await nongameChannel.permissionOverwrites.edit(outUser, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await picksChannel.permissionOverwrites.edit(outUser, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await paragraphsChannel.permissionOverwrites.edit(outUser, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await loversChannel.permissionOverwrites.edit(outUser, {
      [PermissionFlagsBits.ViewChannel]: false,
      [PermissionFlagsBits.SendMessages]: false,
      [PermissionFlagsBits.ReadMessageHistory]: false,
    });
    await spiesChannel.permissionOverwrites.edit(outUser, {
      [PermissionFlagsBits.ViewChannel]: false,
      [PermissionFlagsBits.SendMessages]: false,
      [PermissionFlagsBits.ReadMessageHistory]: false,
    });
  } catch (error) {
    await interaction.channel.send('Cannot remove channel perms!');
  }

  await gameInfo.set('gameState', gameState);
  await gameInfo.set('players', currentPlayers);

  await interaction.editReply({
    content: `You made the removal successfully!`,
    ephemeral: true,
  });
  await interaction.channel.send(
    `<@${outUser}> has been removed from the game!`,
  );
}

module.exports = {
  data,
  execute,
};
