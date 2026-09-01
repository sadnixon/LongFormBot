'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const {
  standardEmbed,
  sendGameState,
  sendVoteState,
  isUnique,
} = require('../message-helpers');
const { clearTasks, scheduleInXHours } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('pick')
  .setDescription('Pick your mission')
  .addUserOption((option) =>
    option
      .setName('player1')
      .setDescription('The first player to add to your mission')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('player2')
      .setDescription('The second player to add to your mission')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('player3')
      .setDescription('The third player to add to your mission')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('player4')
      .setDescription('The fourth player to add to your mission')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('player5')
      .setDescription(
        'The fifth player to add to your mission (Pick on M2 onward)',
      )
      .setRequired(false),
  )
  .addUserOption((option) =>
    option
      .setName('player6')
      .setDescription(
        'The sixth player to add to your mission (Pick on M3 onward)',
      )
      .setRequired(false),
  )
  .addUserOption((option) =>
    option
      .setName('player7')
      .setDescription(
        'The seventh player to add to your mission (Pick on M4/6/7)',
      )
      .setRequired(false),
  );

const missionSizes = [4, 5, 6, 7, 6, 7, 7];

async function execute(interaction, user) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const gameState = await gameInfo.get('gameState');
  if (
    !gameOngoing ||
    gameState.currentState !== 'pickWait' ||
    !gameState.missionPickers[gameState.missionIndex].includes(
      interaction.user.id,
    )
  ) {
    return interaction.reply({
      content: `It's not time for you to make a pick!`,
      ephemeral: true,
    });
  }
  const currentPlayers = await gameInfo.get('players');
  const targetUsers = [];
  for (let i = 1; i < 8; i++) {
    targetUsers.push(interaction.options.getUser(`player${i}`));
  }
  const targetIds = targetUsers
    .filter((e) => e != null)
    .map((e) => e.id)
    .filter((e) => currentPlayers.includes(e));
  if (
    targetIds.length !== missionSizes[gameState.missionIndex] ||
    !isUnique(targetIds)
  ) {
    return interaction.reply({
      content: `That was an incorrect amount of players! You have to submit ${missionSizes[gameState.missionIndex]} valid players!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );

  gameState.missionPicks[gameState.missionIndex][interaction.user.id] = {
    id: interaction.user.id,
    team: targetIds,
  };

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A pick has been made!',
      `**<@${interaction.user.id}> picked:**\n${targetIds.map((e) => `<@${e}>`).join(', ')}`,
    ),
  );
  await interaction.reply({
    content: `You made a pick!`,
    ephemeral: true,
  });

  if (
    Object.keys(gameState.missionPicks[gameState.missionIndex]).length ===
    gameState.missionPickers[gameState.missionIndex].length
  ) {
    await clearTasks();
    gameState.currentState = 'voteWait';
    await gameInfo.set('gameState', gameState);
    await pickChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nIt's time to vote for an M${gameState.missionIndex + 1}! Go cast your vote for one of the following choices with /vote.`,
    );
    await sendVoteState(interaction.client);
    await sendGameState(interaction.client);

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
      gameState.currentState = 'missionWait';
      gameState.passedMissions.push(
        gameState.missionPicks[gameState.missionIndex][mostVotesMission],
      );
      await gameInfo.set('gameState', gameState);
      await pickChannel.send(
        `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nThe mission chosen by <@${mostVotesMission}> has passed!`,
      );
      await sendGameState(interaction.client);
      await genChannel.send(
        `${gameState.passedMissions[gameState.missionIndex].team.map((e) => `<@${e}>`).join(' ')}\nIt's time to run M${gameState.missionIndex + 1}! Go decide if the mission will succeed or fail with /mission.`,
      );

      if (
        gameState.passedMissions[gameState.missionIndex] &&
        Object.keys(gameState.missionSFs[gameState.missionIndex]).filter((e) =>
          gameState.passedMissions[gameState.missionIndex].team.includes(e),
        ).length >= missionSizes[gameState.missionIndex]
      ) {
        await missionCompletion(interaction.client);
      } else {
        await scheduleInXHours('end_mission', {}, 6);
      }
    } else {
      await scheduleInXHours('end_vote', {}, 2);
    }
  }
}

module.exports = {
  data,
  execute,
};
