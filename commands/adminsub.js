'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

async function createPrivateChannel(guild, userDisplay, userId) {
  const channel = await guild.channels.create({
    name: `private-${userDisplay}`,
    type: ChannelType.GuildText,

    permissionOverwrites: [
      {
        // Hide the channel from everyone by default
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        // Allow the specific user to see and use it
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

  return channel;
}

const data = new SlashCommandBuilder()
  .setName('adminsub')
  .setDescription('Substitute one game player for another')
  .addUserOption((option) =>
    option
      .setName('out')
      .setDescription('The user to be subbed out')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('in')
      .setDescription('The user to be subbed in')
      .setRequired(true),
  );

async function execute(interaction, user) {
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  const currentPlayers = await gameInfo.get('players');

  const outUser = interaction.options.getUser('out').id;
  const inUserNoId = interaction.options.getUser('in');
  const inUser = inUserNoId.id;

  if (!gameOngoing || !currentPlayers.includes(outUser)) {
    return interaction.reply({
      content: `It's not time for you to sub this user!`,
      ephemeral: true,
    });
  }
  const gameState = await gameInfo.get('gameState');
  const gameChannels = await gameInfo.get('game_channels');
  const playerChannels = await gameInfo.get('player_channels');
  const playerIndex = gameState.players.map((e) => e.id).indexOf(outUser);

  //GAMESTATE STUFF
  gameState.players[playerIndex].id = inUser;
  if (gameState.refChain.includes(outUser)) {
    const repIdx = gameState.refChain.indexOf(outUser);
    gameState.refChain = gameState.refChain.toSpliced(repIdx, 1, inUser);
  }
  for (let i = 0; i < gameState.missionPicks.length; i++) {
    if (outUser in gameState.missionPicks[i]) {
      gameState.missionPicks[i][inUser] = gameState.missionPicks[i][outUser];
      gameState.missionPicks[i][inUser].id = inUser;
      delete gameState.missionPicks[i][outUser];
    }
    for (const id of Object.keys(gameState.missionPicks[i])) {
      if (gameState.missionPicks[i][id].team.includes(outUser)) {
        const repIdx = gameState.missionPicks[i][id].team.indexOf(outUser);
        gameState.missionPicks[i][id].team = gameState.missionPicks[i][
          id
        ].team.toSpliced(repIdx, 1, inUser);
      }
    }
  }
  for (let i = 0; i < gameState.missionPickers.length; i++) {
    if (gameState.gameState.missionPickers[i].includes(outUser)) {
      const repIdx = gameState.missionPickers[i].indexOf(outUser);
      gameState.missionPickers[i] = gameState.missionPickers[i].toSpliced(
        repIdx,
        1,
        inUser,
      );
    }
  }
  for (let i = 0; i < gameState.missionSFs.length; i++) {
    if (outUser in gameState.missionSFs[i]) {
      gameState.missionSFs[i][inUser] = gameState.missionSFs[i][outUser];
      delete gameState.missionSFs[i][outUser];
    }
  }
  for (let i = 0; i < gameState.passedMissions.length; i++) {
    if (gameState.passedMissions[i].id === outUser) {
      gameState.passedMissions[i].id = inUser;
    }
    if (gameState.passedMissions[i].team.includes(outUser)) {
      const repIdx = gameState.passedMissions[i].team.indexOf(outUser);
      gameState.passedMissions[i].team = gameState.passedMissions[
        i
      ].team.toSpliced(repIdx, 1, inUser);
    }
  }
  if (outUser in gameState.witchCurses) {
    gameState.gameState.witchCurses[inUser] = gameState.witchCurses[outUser];
    gameState.witchCurses[inUser].id = inUser;
    delete gameState.witchCurses[outUser];
  }
  for (let i = 0; i < gameState.witchResults.length; i++) {
    if (gameState.witchResults[i].id === outUser) {
      gameState.witchResults[i].id = inUser;
    }
  }
  //CURRENT PLAYERS
  const currentPlayerIdx = currentPlayers.indexOf(outUser);
  currentPlayers = currentPlayers.toSpliced(currentPlayerIdx, 1, inUser);

  let playerChannel;
  if (inUser in playerChannels) {
    playerChannel = await interaction.guild.channels.fetch(
      playerChannels[inUser].channelId,
    );
  } else {
    const displayName = inUserNoId.globalName ?? inUserNoId.username;
    playerChannel = await createPrivateChannel(
      interaction.guild,
      displayName,
      inUser,
    );
    playerChannels[inUser] = {
      id: inUser,
      displayName: displayName,
      channelId: playerChannel.id,
    };
    await gameInfo.set('player_channels', playerChannels);
  }

  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const picksChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const loversChannel = await interaction.guild.channels.fetch(
    gameChannels['lovers'].channelId,
  );
  const spiesChannel = await interaction.guild.channels.fetch(
    gameChannels['spies'].channelId,
  );

  await genChannel.permissionOverwrites.edit(inUser, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: true,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await picksChannel.permissionOverwrites.edit(inUser, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: true,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });

  await genChannel.permissionOverwrites.edit(outUser, {
    [PermissionFlagsBits.SendMessages]: false,
  });
  await picksChannel.permissionOverwrites.edit(outUser, {
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

  await playerChannel.send(
    `**<@${inUser}>, you are ${gameState.players[playerIndex].role}!**`,
  );

  const visibleSpies = gameState.players
    .filter((e) => ['Morgana', 'Assassin', 'Oberon', 'Witch'].includes(e.role))
    .map((e) => e.id);
  const knownSpies = gameState.players
    .filter((e) => ['Morgana', 'Assassin', 'Mordred', 'Witch'].includes(e.role))
    .map((e) => e.id);
  const merlinOptions = gameState.players
    .filter((e) => ['Merlin', 'Morgana'].includes(e.role))
    .map((e) => e.id);
  const isoldeId = gameState.players.filter((e) => e.role === 'Isolde')[0].id;
  const tristanId = gameState.players.filter((e) => e.role === 'Tristan')[0].id;

  if (
    ['Morgana', 'Assassin', 'Mordred', 'Witch'].includes(
      gameState.players[playerIndex].role,
    )
  ) {
    await spiesChannel.permissionOverwrites.edit(inUser, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.SendMessages]: true,
      [PermissionFlagsBits.ReadMessageHistory]: true,
    });

    await playerChannel.send(
      standardEmbed(
        'You see the following Spies:',
        knownSpies.map((e) => `<@${e}>`).join(', '),
      ),
    );
  } else if (
    ['Tristan', 'Isolde'].includes(gameState.players[playerIndex].role)
  ) {
    await loversChannel.permissionOverwrites.edit(inUser, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.SendMessages]: true,
      [PermissionFlagsBits.ReadMessageHistory]: true,
    });

    if (gameState.players[playerIndex].role === 'Tristan') {
      await playerChannel.send(
        standardEmbed('Your beautiful Irish princess is:', `<@${isoldeId}>`),
      );
    } else {
      await playerChannel.send(
        standardEmbed('Your heroic Cornish knight is:', `<@${tristanId}>`),
      );
    }
  } else if (gameState.players[playerIndex].role === 'Merlin') {
    await playerChannel.send(
      standardEmbed(
        'You see the following Spies:',
        visibleSpies.map((e) => `<@${e}>`).join(', '),
      ),
    );
  } else if (gameState.players[playerIndex].role === 'Percival') {
    await playerChannel.send(
      standardEmbed(
        'You see the following Merlin options:',
        merlinOptions.map((e) => `<@${e}>`).join(', '),
      ),
    );
  }

  if (gameState.refChain.slice(0, -1).includes(inUser)) {
    const refChainIdx = gameState.refChain.indexOf(inUser);
    const targetPlayer = gameState.refChain[refChainIdx + 1];
    const targetPlayerIndex = gameState.players
      .map((e) => e.id)
      .indexOf(targetPlayer);
    const targetTeam = gameState.players[targetPlayerIndex].team;

    await playerChannel.send(
      standardEmbed(
        'The Ref of the Rain reveals to you the following information:',
        `<@${targetPlayer}> is on the ${targetTeam} team!`,
      ),
    );
  }

  await gameInfo.set('gameState', gameState);
  await gameInfo.set('players', currentPlayers);

  await interaction.reply({
    content: `<@${outUser}> has been subbed out and replaced with <@${inUser}>!`,
    ephemeral: false,
  });
}

module.exports = {
  data,
  execute,
};
