const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const _ = require('lodash');
const { clearTasks, scheduleInXHours } = require('./scheduler');

const errorMessage = (message) => {
  return {
    embeds: [new EmbedBuilder().setDescription(message).setColor('#ff0000')],
  };
};

const colorMap = {
  fascist: '#D66C4D',
  liberal: '#64A6B8',
  neutral: '#EAE6B1',
  communist: '#B1342D',
};

const missionSizes = [4, 5, 6, 7, 6, 7, 7];
const failsNeeded = [1, 1, 1, 2, 1, 2, 1];

const standardEmbed = (header, message, team = 'neutral') => {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(header)
        .setDescription(message)
        .setColor(colorMap[team]),
    ],
  };
};

async function startGame(interaction) {
  await gameInfo.set('inPlay', true);
  await gameInfo.set('inReady', false);
  await gameInfo.set('readyPlayers', []);
  const player_num = 13;
  const roles = [
    'Merlin',
    'Percival',
    'Tristan',
    'Isolde',
    'Resistance',
    'Resistance',
    'Resistance',
    'Resistance',
    'Morgana',
    'Assassin',
    'Oberon',
    'Mordred',
    'Witch',
  ];

  const gameChannels = await gameInfo.get('game_channels');
  const playerChannels = await gameInfo.get('player_channels');
  const players = await gameInfo.get('players');

  const shuffledRoles = shuffleArray(roles);
  const shuffledPlayers = shuffleArray(players);
  //const refIndex = randomNumber(player_num);
  const refIndex = player_num - 1;
  const visibleSpies = shuffledPlayers.filter((e, i) =>
    ['Morgana', 'Assassin', 'Oberon', 'Witch'].includes(shuffledRoles[i]),
  );
  const knownSpies = shuffledPlayers.filter((e, i) =>
    ['Morgana', 'Assassin', 'Mordred', 'Witch'].includes(shuffledRoles[i]),
  );
  const merlinOptions = shuffledPlayers.filter((e, i) =>
    ['Merlin', 'Morgana'].includes(shuffledRoles[i]),
  );

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
  const heavenChannel = await interaction.guild.channels.fetch(
    gameChannels['heaven'].channelId,
  );

  for (const channel of [
    genChannel,
    picksChannel,
    loversChannel,
    spiesChannel,
    heavenChannel,
  ]) {
    await channel.permissionOverwrites.set([]);
  }

  for (let i = 0; i < player_num; i++) {
    if (
      !_.range(0, 13)
        .map((e) => `${e * 100}`)
        .includes(shuffledPlayers[i])
    ) {
      await genChannel.permissionOverwrites.edit(shuffledPlayers[i], {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: true,
        [PermissionFlagsBits.ReadMessageHistory]: true,
      });
      await picksChannel.permissionOverwrites.edit(shuffledPlayers[i], {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: true,
        [PermissionFlagsBits.ReadMessageHistory]: true,
      });
    }
    const playerChannel = await interaction.guild.channels.fetch(
      playerChannels[shuffledPlayers[i]].channelId,
    );
    await playerChannel.send(
      `**<@${shuffledPlayers[i]}>, you are ${shuffledRoles[i]}!**`,
    );
    if (
      ['Morgana', 'Assassin', 'Mordred', 'Witch'].includes(shuffledRoles[i])
    ) {
      if (
        !_.range(0, 13)
          .map((e) => `${e * 100}`)
          .includes(shuffledPlayers[i])
      ) {
        await spiesChannel.permissionOverwrites.edit(shuffledPlayers[i], {
          [PermissionFlagsBits.ViewChannel]: true,
          [PermissionFlagsBits.SendMessages]: true,
          [PermissionFlagsBits.ReadMessageHistory]: true,
        });
      }

      await playerChannel.send(
        standardEmbed(
          'You see the following Spies:',
          knownSpies.map((e) => `<@${e}>`).join(', '),
        ),
      );
    } else if (['Tristan', 'Isolde'].includes(shuffledRoles[i])) {
      if (
        !_.range(0, 13)
          .map((e) => `${e * 100}`)
          .includes(shuffledPlayers[i])
      ) {
        await loversChannel.permissionOverwrites.edit(shuffledPlayers[i], {
          [PermissionFlagsBits.ViewChannel]: true,
          [PermissionFlagsBits.SendMessages]: true,
          [PermissionFlagsBits.ReadMessageHistory]: true,
        });
      }
      if (shuffledRoles[i] === 'Tristan') {
        await playerChannel.send(
          standardEmbed(
            'Your beautiful Irish princess is:',
            `<@${shuffledPlayers[shuffledRoles.indexOf('Isolde')]}>`,
          ),
        );
      } else {
        await playerChannel.send(
          standardEmbed(
            'Your heroic Cornish knight is:',
            `<@${shuffledPlayers[shuffledRoles.indexOf('Tristan')]}>`,
          ),
        );
      }
    } else if (shuffledRoles[i] === 'Merlin') {
      await playerChannel.send(
        standardEmbed(
          'You see the following Spies:',
          visibleSpies.map((e) => `<@${e}>`).join(', '),
        ),
      );
    } else if (shuffledRoles[i] === 'Percival') {
      await playerChannel.send(
        standardEmbed(
          'You see the following Merlin options:',
          merlinOptions.map((e) => `<@${e}>`).join(', '),
        ),
      );
    }
  }

  const startState = {
    guildId: interaction.guildId,
    players: _.range(0, player_num).map((i) => ({
      id: shuffledPlayers[i],
      role: shuffledRoles[i],
      team: ['Merlin', 'Percival', 'Tristan', 'Isolde', 'Resistance'].includes(
        shuffledRoles[i],
      )
        ? 'Resistance'
        : 'Spy',
    })),
    refChain: [shuffledPlayers[refIndex]],
    missionPicks: [{}, {}, {}, {}, {}, {}, {}],
    missionPickers: [
      [shuffledPlayers[0], shuffledPlayers[1], shuffledPlayers[2]],
      [],
      [],
      [],
      [],
      [],
      [],
    ],
    missionVotes: [
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
    ],
    missionSFs: [{}, {}, {}, {}, {}, {}, {}],
    passedMissions: [],
    missionResults: [],
    missionSuccs: 0,
    missionFails: 0,
    missionIndex: 0,
    witchCurses: {},
    witchResults: [],
    witchPunished: false,
    assassinShot: [],
    currentState: 'pickWait',
  };

  console.log(startState);
  console.log(startState.players);
  await gameInfo.set('gameState', startState);

  await sendGameState(interaction.client, 'general');
  await genChannel.send(
    `${startState.missionPickers[startState.missionIndex].map((e) => `<@${e}>`).join(', ')}, it is time to pick a mission using /pick.`,
  );
  await scheduleInXHours('end_pick', {}, 16);
}

async function sendGameState(
  client,
  chanSelect = 'general',
  reveal = false,
  winner = 'none',
  interaction = null,
) {
  const gameChannels = await gameInfo.get('game_channels');
  const gameState = await gameInfo.get('gameState');
  const guild = await client.guilds.fetch(gameState.guildId);
  const genChannel = await guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const currentChannel = interaction ? interaction.channel : genChannel;
  let channel;
  if (chanSelect === 'general') {
    channel = genChannel;
  } else {
    channel = currentChannel;
  }

  let pCrowns = gameState.players.map((e) =>
    gameState.missionPickers[gameState.missionIndex].includes(e.id) ? '👑' : '',
  );

  if (reveal && winner !== 'none') {
    pCrowns = gameState.players.map((e) => (e.team === winner ? '👑' : ''));
  }

  const pRef = gameState.players.map((e) =>
    gameState.refChain.at(-1) === e.id ? '🐉' : '',
  );

  let waitingOnIds;

  if (gameState.currentState === 'pickWait') {
    waitingOnIds = gameState.missionPickers[gameState.missionIndex];
  } else if (gameState.currentState === 'voteWait') {
    waitingOnIds = gameState.players
      .filter(
        (e, i) => gameState.missionVotes[gameState.missionIndex][i] === null,
      )
      .map((e) => e.id);
  } else if (gameState.currentState === 'missionWait') {
    waitingOnIds = gameState.passedMissions[gameState.missionIndex].team;
  } else if (gameState.currentState === 'refWait') {
    waitingOnIds = [gameState.refChain.at(-1)];
  } else if (gameState.currentState === 'assassinWait') {
    waitingOnIds = [
      gameState.players.filter((e) => e.role === 'Assassin')[0].id,
    ];
  } else {
    waitingOnIds = [];
  }

  const playerHist = (id) => {
    const isLeader = gameState.passedMissions.map((e) => e.id === id);
    const isOn = gameState.passedMissions.map((e) => e.team.includes(id));
    const isFinished = gameState.passedMissions.map(
      (e, i) => i < gameState.missionResults.length,
    );
    const isSuccess = gameState.missionResults.map((e) => e === 'succeed');
    return gameState.passedMissions
      .map((e, i) =>
        isFinished[i]
          ? isLeader[i]
            ? isOn[i]
              ? isSuccess[i]
                ? '🔵'
                : '🔴'
              : '⚪'
            : isOn[i]
              ? isSuccess[i]
                ? '🟦'
                : '🟥'
              : '⬛'
          : isLeader[i]
            ? isOn[i]
              ? '🟡'
              : '⚪'
            : isOn[i]
              ? '🟨'
              : '⬛',
      )
      .join('');
  };

  let witchHistory = '';
  if (reveal) {
    const triggeredWitches = gameState.witchResults;
    const untriggeredWitches = Object.values(gameState.witchCurses).filter(
      (e) => !e.triggered,
    );
    const allWitches = [...triggeredWitches, ...untriggeredWitches];
    witchHistory = `**Witch Guesses:**\n${allWitches.map((e, i) => `${i + 1}. <@${e.id}> = ${e.role.toUpperCase()} ${'index' in e ? (e.success ? '✅' : '❌') : '❔'}`).join('\n')}\n\n`;
  }

  const missionSection = gameState.passedMissions
    .map(
      (e, i) =>
        `**M${i + 1}:** ${gameState.missionResults[i] ? (gameState.missionResults[i] === 'fail' ? '🟥 ' : '🟦 ') : ''}<@${e.id}>'s (${e.team.map((e1) => `<@${e1}>`).join(' + ')})`,
    )
    .join('\n');

  const embed = standardEmbed(
    'Current Game State:',
    `${gameState.players.map((e, i) => `${i + 1}. ${playerHist(e.id)}<@${e.id}> ${pCrowns[i]}${pRef[i]}${reveal ? `**(${e.role})**` : ''}`).join('\n')}\n**Ref Chain:** ${gameState.refChain.map((e) => `<@${e}>`).join('-> ')}\n\n**Missions:**\n${missionSection}\n\n${witchHistory}**Waiting on:** ${waitingOnIds.map((e) => `<@${e}>`).join(', ')}\n\n**State:** ${gameState.currentState}`,
  );

  await channel.send(embed);
}

async function sendVoteState(
  client,
  chanSelect = 'picks',
  index = -1,
  interaction = null,
) {
  const gameChannels = await gameInfo.get('game_channels');
  const gameState = await gameInfo.get('gameState');
  const guild = await client.guilds.fetch(gameState.guildId);
  const pickChannel = await guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const currentChannel = interaction ? interaction.channel : pickChannel;
  let channel;
  if (chanSelect === 'picks') {
    channel = pickChannel;
  } else {
    channel = currentChannel;
  }

  let missionIndex = index - 1;
  if (index === -1 || index - 1 > gameState.missionIndex) {
    missionIndex = gameState.missionIndex;
  }

  const cMissionPicks = gameState.missionPicks[missionIndex];
  const cMissionPickers = gameState.missionPickers[missionIndex];
  const cMissionVotes = gameState.missionVotes[missionIndex];

  let resultText = '';
  if (gameState.missionResults[missionIndex]) {
    const validOutcomes = _.pick(
      gameState.missionSFs[missionIndex],
      gameState.passedMissions[missionIndex].team,
    );

    const failCount = Object.values(validOutcomes).filter(
      (e) => e === 'fail',
    ).length;
    resultText = `\n\n**<@${gameState.passedMissions[missionIndex].id}> Result: ${gameState.missionResults[missionIndex].toUpperCase()} with ${failCount} fail(s)**`;
  }

  const optionVotes = (option) => {
    return gameState.players
      .filter((e, i) => cMissionVotes[i] === option)
      .map((e) => e.id);
  };

  const embed = standardEmbed(
    `Current M${missionIndex + 1} Vote State`,
    `${cMissionPickers
      .map(
        (e) =>
          `**<@${e}>'s Mission (${e in cMissionPicks ? cMissionPicks[e].team.map((e1) => `<@${e1}>`).join(' + ') : ''})**\n${optionVotes(e).length} Votes: ${optionVotes(
            e,
          )
            .map((e1) => `<@${e1}>`)
            .join(', ')}`,
      )
      .join('\n\n')}\n\nNot Voted: ${optionVotes(null)
      .map((e1) => `<@${e1}>`)
      .join(', ')}${resultText}`,
  );

  await channel.send(embed);
}

async function missionCompletion(client) {
  await clearTasks();
  const gameState = await gameInfo.get('gameState');
  const guild = await client.guilds.fetch(gameState.guildId);
  const currentPlayers = await gameInfo.get('players');

  const gameChannels = await gameInfo.get('game_channels');
  const playerChannels = await gameInfo.get('player_channels');
  const genChannel = await guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  const validOutcomes = _.pick(
    gameState.missionSFs[gameState.missionIndex],
    gameState.passedMissions[gameState.missionIndex].team,
  );

  //Witch shit
  for (const id of Object.keys(validOutcomes)) {
    const playerIndex = gameState.players.map((e) => e.id).indexOf(id);
    if (
      gameState.missionFails < 3 &&
      id in gameState.witchCurses &&
      gameState.witchCurses[id].triggered === false
    ) {
      if (
        (gameState.witchCurses[id].role === 'lover' &&
          ['Tristan', 'Isolde'].includes(
            gameState.players[playerIndex].role,
          )) ||
        (gameState.witchCurses[id].role === 'percival' &&
          gameState.players[playerIndex].role === 'Percival')
      ) {
        validOutcomes[id] = 'fail';
        gameState.witchCurses[id].triggered = true;
        gameState.witchResults.push({
          id: id,
          role: gameState.witchCurses[id].role,
          success: true,
          index: gameState.missionIndex,
        });
        const playerChannel = await guild.channels.fetch(
          playerChannels[id].channelId,
        );
        await playerChannel.send(
          `<@${id}>, the Witch guessed your role correctly, which means you have been Witched into failing this mission.`,
        );
      } else {
        gameState.witchCurses[id].triggered = true;
        gameState.witchResults.push({
          id: id,
          role: gameState.witchCurses[id].role,
          success: false,
          index: gameState.missionIndex,
        });
      }
    }
  }

  for (const id of Object.keys(validOutcomes)) {
    if (
      validOutcomes[id] === 'fail' &&
      !gameState.witchPunished &&
      gameState.witchResults.length > 1 &&
      !gameState.witchResults[0].success &&
      !gameState.witchResults[1].success
    ) {
      gameState.witchPunished = true;
      validOutcomes[id] = 'success';
      await genChannel.send(
        standardEmbed(
          'There has been a second failed Witch guess!',
          `A fail on this mission has been turned into a success as punishment.`,
        ),
      );
    }
  }

  const failCount = Object.values(validOutcomes).filter(
    (e) => e === 'fail',
  ).length;
  if (failCount >= failsNeeded[gameState.missionIndex]) {
    await genChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nThe mission chosen by <@${gameState.passedMissions[gameState.missionIndex].id}> has FAILED with ${failCount} fail(s)!`,
    );
    gameState.missionFails += 1;

    gameState.missionResults.push('fail');
    if (gameState.missionFails < 4) {
      gameState.missionIndex += 1;
      //Ref of the rain case
      gameState.currentState = 'refWait';
      await gameInfo.set('gameState', gameState);
      await genChannel.send(
        `It's time for <@${gameState.refChain.at(-1)}> to choose a player to use the Ref of the Rain card on using /ref!`,
      );
      await scheduleInXHours('end_ref', {}, 12);
    } else {
      //Mission loss case
      gameState.currentState = 'gameEnd';
      await gameInfo.set('gameState', gameState);
      await genChannel.send(
        standardEmbed(
          'There has been a loss on missions!',
          `This is the fourth mission to fail.`,
        ),
      );
      await endGame(client);
    }
  } else {
    await genChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nThe mission chosen by <@${gameState.passedMissions[gameState.missionIndex].id}> has SUCCEEDED!. Number of fails: ${failCount}.`,
    );
    gameState.missionSuccs += 1;

    gameState.missionResults.push('succeed');
    if (gameState.missionSuccs < 4) {
      gameState.missionIndex += 1;
      //Going straight to next phase case
      gameState.currentState = 'pickWait';
      const nextUpIndex =
        gameState.players
          .map((e) => e.id)
          .indexOf(
            gameState.missionPickers[gameState.missionIndex - 1].at(-1),
          ) + 1;
      for (let i = 0; i < 3 + gameState.missionFails; i++) {
        gameState.missionPickers[gameState.missionIndex].push(
          gameState.players[(nextUpIndex + i) % 13].id,
        );
      }
      await gameInfo.set('gameState', gameState);
      await sendGameState(client);
      await genChannel.send(
        `${gameState.missionPickers[gameState.missionIndex].map((e) => `<@${e}>`).join(', ')}, it is time to pick a mission using /pick.`,
      );
      await scheduleInXHours('end_pick', {}, 16);
    } else {
      //Going to assassination case
      gameState.currentState = 'assassinWait';
      await gameInfo.set('gameState', gameState);
      const assassinPlayer = gameState.players.filter(
        (e) => e.role === 'Assassin',
      )[0].id;
      await sendGameState(client);
      await genChannel.send(
        `This is the fourth mission to succeed. It's time for <@${assassinPlayer}> to choose a player (or players) to assassinate using /assassin!`,
      );
      await scheduleInXHours('end_assassin', {}, 24);
    }
  }
}

async function endGame(client) {
  const gameState = await gameInfo.get('gameState');
  const guild = await client.guilds.fetch(gameState.guildId);
  const currentPlayers = await gameInfo.get('players');

  const gameChannels = await gameInfo.get('game_channels');
  const playerChannels = await gameInfo.get('player_channels');
  const genChannel = await guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const picksChannel = await guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const heavenChannel = await guild.channels.fetch(
    gameChannels['heaven'].channelId,
  );

  for (const id in currentPlayers) {
    await genChannel.permissionOverwrites.edit(id, {
      [PermissionFlagsBits.SendMessages]: true,
    });
    await picksChannel.permissionOverwrites.edit(id, {
      [PermissionFlagsBits.SendMessages]: true,
    });
    await heavenChannel.permissionOverwrites.edit(id, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.SendMessages]: true,
      [PermissionFlagsBits.ReadMessageHistory]: true,
    });
  }

  const shot1Index = gameState.players
    .map((e) => e.id)
    .indexOf(gameState.assassinShot[0]);
  const shot2Index =
    gameState.assassinShot.length > 1
      ? gameState.players.map((e) => e.id).indexOf(gameState.assassinShot[1])
      : null;

  let winningTeam;
  if (
    (gameState.assassinShot.length > 1 &&
      ['Tristan', 'Isolde'].includes(gameState.players[shot1Index].role) &&
      ['Tristan', 'Isolde'].includes(gameState.players[shot2Index].role)) ||
    (gameState.assassinShot.length === 1 &&
      gameState.players[shot1Index].role === 'Merlin') ||
    (gameState.assassinShot.length === 0 && gameState.missionFails > 3)
  ) {
    await genChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\n# THE SPIES WIN!`,
    );
    winningTeam = 'Spy';
  } else if (
    (gameState.assassinShot.length > 1 &&
      (!['Tristan', 'Isolde'].includes(gameState.players[shot1Index].role) ||
        !['Tristan', 'Isolde'].includes(gameState.players[shot2Index].role))) ||
    (gameState.assassinShot.length === 1 &&
      gameState.players[shot1Index].role !== 'Merlin')
  ) {
    await genChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\n# THE RESISTANCE WIN!`,
    );
    winningTeam = 'Resistance';
  }
  await gameInfo.set('inPlay', false);
  await gameInfo.set('players', []);
  await sendGameState(client, 'general', true, winningTeam);
}

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
};

const randomNumber = (max) => {
  return Math.floor(Math.random() * (max + 1));
};

const isUnique = (arr) => arr.length === new Set(arr).size;

module.exports = {
  errorMessage,
  standardEmbed,
  shuffleArray,
  startGame,
  endGame,
  sendGameState,
  sendVoteState,
  missionCompletion,
  isUnique,
};
