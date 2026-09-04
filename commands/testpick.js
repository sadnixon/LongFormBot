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
const { clearTasks, scheduleInXHours, cancelTask } = require('../scheduler');

const idChoice = (id) => {
  return {
    name: id,
    value: id,
  };
};

const data = new SlashCommandBuilder()
  .setName('testpick')
  .setDescription('Pick your mission')
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
      .setName('player1')
      .setDescription('The first player to add to your mission')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('player2')
      .setDescription('The second player to add to your mission')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('player3')
      .setDescription('The third player to add to your mission')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('player4')
      .setDescription('The fourth player to add to your mission')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('player5')
      .setDescription(
        'The fifth player to add to your mission (Pick on M2 onward)',
      )
      .setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName('player6')
      .setDescription(
        'The sixth player to add to your mission (Pick on M3 onward)',
      )
      .setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName('player7')
      .setDescription(
        'The seventh player to add to your mission (Pick on M4/6/7)',
      )
      .setRequired(false),
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
  if (
    !gameOngoing ||
    gameState.currentState !== 'pickWait' ||
    !gameState.missionPickers[gameState.missionIndex].includes(userId)
  ) {
    return interaction.reply({
      content: `It's not time for you to make a pick!`,
      ephemeral: true,
    });
  }
  const currentPlayers = await gameInfo.get('players');
  const targetUsers = [];
  for (let i = 1; i < 8; i++) {
    targetUsers.push(interaction.options.getString(`player${i}`));
  }
  const targetIds = targetUsers
    .filter((e) => e != null)
    //.map((e) => e.id)
    .filter((e) => currentPlayers.includes(e));
  if (
    targetIds.length !== gameState.missionSizes[gameState.missionIndex] ||
    !isUnique(targetIds)
  ) {
    return interaction.reply({
      content: `That was an incorrect amount of players! You have to submit ${gameState.missionSizes[gameState.missionIndex]} valid players!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  gameState.missionPicks[gameState.missionIndex][userId] = {
    id: userId,
    team: targetIds,
  };

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A pick has been made!',
      `**<@${userId}> picked:**\n${targetIds.map((e) => `<@${e}>`).join(', ')}`,
    ),
  );
  await interaction.reply({
    content: `You made a pick!`,
    ephemeral: true,
  });

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

  if (
    Object.keys(gameState.missionPicks[gameState.missionIndex]).length ===
      gameState.missionPickers[gameState.missionIndex].length &&
    mostVotes >= 7
  ) {
    await clearTasks();
    const gameState = await gameInfo.get('gameState');
    gameState.currentState = 'missionWait';
    gameState.passedMissions.push(
      gameState.missionPicks[gameState.missionIndex][mostVotesMission],
    );
    await gameInfo.set('gameState', gameState);
    await sendVoteState(interaction.client);
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
      ).length >= gameState.missionSizes[gameState.missionIndex]
    ) {
      await missionCompletion(interaction.client);
    } else {
      await scheduleInXHours('end_mission', {}, 6);
    }
  }
}

module.exports = {
  data,
  execute,
};
