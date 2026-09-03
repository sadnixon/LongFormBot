'use strict';

const {
  shuffleArray,
  sendGameState,
  sendVoteState,
  missionCompletion,
  standardEmbed,
  endGame,
} = require('./message-helpers');
const {
  registerHandler,
  scheduleInXHours,
  clearTasks,
} = require('./scheduler');
const _ = require('lodash');

const missionSizes = [4, 5, 6, 7, 6, 7, 7];

let client;

function initializeTaskHandlers(discordClient) {
  client = discordClient;

  registerHandler('end_vote', async (data) => {
    const currentPlayers = await gameInfo.get('players');
    const gameState = await gameInfo.get('gameState');
    const guild = await client.guilds.fetch(gameState.guildId);
    const gameChannels = await gameInfo.get('game_channels');
    const pickChannel = await guild.channels.fetch(
      gameChannels['picks'].channelId,
    );
    const genChannel = await guild.channels.fetch(
      gameChannels['general'].channelId,
    );

    gameState.phaseTimers = [];

    let mostVotes = 0;
    let mostVotesMissions = [];
    for (const mission of gameState.missionPickers[gameState.missionIndex]) {
      const voteCount = gameState.missionVotes[gameState.missionIndex].filter(
        (e) => e === mission,
      ).length;
      if (voteCount > mostVotes) {
        mostVotes = voteCount;
        mostVotesMissions = [mission];
      } else if (voteCount === mostVotes) {
        mostVotesMissions.push(mission);
      }
    }

    if (mostVotesMissions.length > 1) {
      await pickChannel.send(
        standardEmbed(
          'There is a tie in mission votes!',
          `RNG will determine the passing mission between those picked by ${gameState.missionPickers[gameState.missionIndex].map((e) => `<@${e}>`).join(', ')}.`,
        ),
      );
    }
    const passingMission = shuffleArray(mostVotesMissions)[0];

    gameState.currentState = 'missionWait';
    gameState.passedMissions.push(
      gameState.missionPicks[gameState.missionIndex][passingMission],
    );
    await gameInfo.set('gameState', gameState);
    await pickChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nThe mission chosen by <@${passingMission}> has passed!`,
    );
    await sendGameState(client);
    await genChannel.send(
      `${gameState.passedMissions[gameState.missionIndex].team.map((e) => `<@${e}>`).join(' ')}\nIt's time to run M${gameState.missionIndex + 1}! Go decide if the mission will succeed or fail with /mission.`,
    );

    if (
      gameState.passedMissions[gameState.missionIndex] &&
      Object.keys(gameState.missionSFs[gameState.missionIndex]).filter((e) =>
        gameState.passedMissions[gameState.missionIndex].team.includes(e),
      ).length >= missionSizes[gameState.missionIndex]
    ) {
      await missionCompletion(client);
    } else {
      await scheduleInXHours('end_mission', {}, 6);
    }
  });

  registerHandler('end_mission', async (data) => {
    const playerChannels = await gameInfo.get('player_channels');
    const gameState = await gameInfo.get('gameState');
    const guild = await client.guilds.fetch(gameState.guildId);

    if (gameState.currentState !== 'missionWait') {
      return;
    }

    gameState.phaseTimers = [];

    const notVoted = gameState.passedMissions[
      gameState.missionIndex
    ].team.filter((e) => !(e in gameState.missionSFs[gameState.missionIndex]));

    const validOutcomes = _.pick(
      gameState.missionSFs[missionIndex],
      gameState.passedMissions[missionIndex].team,
    );
    const failCount = Object.values(validOutcomes).filter(
      (e) => e === 'fail',
    ).length;

    let possibleOutcomes = [];
    for (const player of notVoted) {
      const playerIndex = gameState.players.map((e) => e.id).indexOf(player);
      if (gameState.players[playerIndex].team === 'Spy' && failCount > 0) {
        possibleOutcomes = ['fail'];
        //possibleOutcomes = ['succeed'];
      } else {
        possibleOutcomes = ['succeed'];
      }
      const targetOutcome = shuffleArray(possibleOutcomes)[0];
      gameState.missionSFs[gameState.missionIndex][player] = targetOutcome;
      const playerChannel = await guild.channels.fetch(
        playerChannels[player].channelId,
      );
      await playerChannel.send(
        `<@${player}>, you have timed out and have been randomly forced to ${targetOutcome.toUpperCase()} this mission.`,
      );
    }
    await gameInfo.set('gameState', gameState);

    await missionCompletion(client);
  });

  registerHandler('end_pick', async (data) => {
    const playerChannels = await gameInfo.get('player_channels');
    const currentPlayers = await gameInfo.get('players');
    const gameState = await gameInfo.get('gameState');
    const guild = await client.guilds.fetch(gameState.guildId);

    const gameChannels = await gameInfo.get('game_channels');
    const pickChannel = await guild.channels.fetch(
      gameChannels['picks'].channelId,
    );

    //removing from gameState the first timer
    gameState.phaseTimers = gameState.phaseTimers.slice(1);

    const notPicked = gameState.missionPickers[gameState.missionIndex].filter(
      (e) => !(e in Object.keys(gameState.missionPicks)),
    );

    for (const player of notPicked) {
      const playerIndex = gameState.players.map((e) => e.id).indexOf(player);
      const targetIds = shuffleArray(currentPlayers).slice(
        0,
        missionSizes[gameState.missionIndex],
      );
      gameState.missionPicks[gameState.missionIndex][player] = {
        id: player,
        team: targetIds,
      };
      const playerChannel = await guild.channels.fetch(
        playerChannels[player].channelId,
      );
      await playerChannel.send(
        `<@${player}>, you have timed out and have been randomly forced to pick (${targetIds.map((e) => `<@${e}>`).join(' + ')}) for this mission.`,
      );
      await pickChannel.send(
        standardEmbed(
          'A pick has been made!',
          `**<@${player}> (randomly) picked:**\n${targetIds.map((e) => `<@${e}>`).join(', ')}`,
        ),
      );
    }

    gameState.currentState = 'voteWait';
    await gameInfo.set('gameState', gameState);
    await pickChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nIt's time to vote for an M${gameState.missionIndex + 1}! Go cast your vote for one of the following choices with /vote.`,
    );
    await sendVoteState(client);
    await sendGameState(client);

    let mostVotes = 0;
    let mostVotesMission;
    for (const mission of gameState.missionPickers[gameState.missionIndex]) {
      const voteCount = gameState.missionVotes[gameState.missionIndex].filter(
        (e) => e === mission,
      ).length;
      if (voteCount > mostVotes) {
        mostVotes = voteCount;
        mostVotesMission = mission;
      }
    }

    if (mostVotes >= 7) {
      await clearTasks();
      const gameState = await gameInfo.get('gameState');
      gameState.currentState = 'missionWait';
      gameState.passedMissions.push(
        gameState.missionPicks[gameState.missionIndex][mostVotesMission],
      );
      await gameInfo.set('gameState', gameState);
      await pickChannel.send(
        `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nThe mission chosen by <@${mostVotesMission}> has passed!`,
      );
      await sendGameState(client);
      await genChannel.send(
        `${gameState.passedMissions[gameState.missionIndex].team.map((e) => `<@${e}>`).join(' ')}\nIt's time to run M${gameState.missionIndex + 1}! Go decide if the mission will succeed or fail with /mission.`,
      );

      if (
        gameState.passedMissions[gameState.missionIndex] &&
        Object.keys(gameState.missionSFs[gameState.missionIndex]).filter((e) =>
          gameState.passedMissions[gameState.missionIndex].team.includes(e),
        ).length >= missionSizes[gameState.missionIndex]
      ) {
        await missionCompletion(client);
      } else {
        await scheduleInXHours('end_mission', {}, 6);
      }
    }
  });

  registerHandler('end_ref', async (data) => {
    const playerChannels = await gameInfo.get('player_channels');
    const currentPlayers = await gameInfo.get('players');
    const gameState = await gameInfo.get('gameState');
    const guild = await client.guilds.fetch(gameState.guildId);

    const gameChannels = await gameInfo.get('game_channels');
    const genChannel = await guild.channels.fetch(
      gameChannels['general'].channelId,
    );

    gameState.phaseTimers = [];

    const targetPlayer = shuffleArray(
      currentPlayers.filter((e) => !gameState.refChain.includes(e)),
    )[0];

    gameState.refChain.push(targetPlayer);
    gameState.currentState = 'pickWait';
    const nextUpIndex =
      gameState.players
        .map((e) => e.id)
        .indexOf(gameState.missionPickers[gameState.missionIndex - 1].at(-1)) +
      1;
    for (let i = 0; i < 3 + gameState.missionFails; i++) {
      gameState.missionPickers[gameState.missionIndex].push(
        gameState.players[(nextUpIndex + i) % 13].id,
      );
    }

    await gameInfo.set('gameState', gameState);

    const playerChannel = await guild.channels.fetch(
      playerChannels[gameState.refChain.at(-2)].channelId,
    );

    const targetPlayerIndex = gameState.players
      .map((e) => e.id)
      .indexOf(targetPlayer);
    const targetTeam = gameState.players[targetPlayerIndex].team;

    await playerChannel.send(
      standardEmbed(
        'RNG has forced the Ref of the Rain to reveal to you the following information:',
        `<@${targetPlayer}> is on the ${targetTeam} team!`,
      ),
    );
    await genChannel.send(
      standardEmbed(
        'The Ref of the Rain has been used!',
        `<@${gameState.refChain.at(-2)}> (randomly) used the card on <@${targetPlayer}> and learned their team.`,
      ),
    );
    await sendGameState(client);
    await genChannel.send(
      `${gameState.missionPickers[gameState.missionIndex].map((e) => `<@${e}>`).join(', ')}, it is time to pick a mission using /pick.`,
    );
    await scheduleInXHours('end_pick', {}, 16);
    await scheduleInXHours('end_vote', {}, 18);
  });

  registerHandler('end_assassin', async (data) => {
    const playerChannels = await gameInfo.get('player_channels');
    const gameState = await gameInfo.get('gameState');
    const guild = await client.guilds.fetch(gameState.guildId);

    const gameChannels = await gameInfo.get('game_channels');
    const genChannel = await guild.channels.fetch(
      gameChannels['general'].channelId,
    );

    gameState.phaseTimers = [];

    const possibleTargets = gameState.players
      .filter(
        (e) => !['Assassin', 'Morgana', 'Mordred', 'Witch'].includes(e.role),
      )
      .map((e) => e.id);

    const targetPlayer = shuffleArray(possibleTargets)[0];
    const targetPlayerIndex = gameState.players
      .map((e) => e.id)
      .indexOf(targetPlayer);

    gameState.assassinShot.push(targetPlayer);

    gameState.currentState = 'gameEnd';
    await gameInfo.set('gameState', gameState);

    const assassinId = gameState.players.filter((e) => e.role === 'Assassin')[0]
      .id;

    await genChannel.send(
      standardEmbed(
        'An assassination was made!',
        `<@${assassinId}> (randomly) assassinated <@${gameState.assassinShot[0]}> as Merlin!\nTheir role was ${gameState.players[targetPlayerIndex].role}.`,
      ),
    );

    await endGame(client);
  });
}

module.exports = {
  initializeTaskHandlers,
};
