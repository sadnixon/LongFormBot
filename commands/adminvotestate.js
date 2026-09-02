'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { sendVoteState } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminvotestate')
  .setDescription('Check on how a mission vote went with results revealed')
  .addIntegerOption((option) =>
    option
      .setName('mission')
      .setDescription('The number of the mission you want to check on')
      .setRequired(false)
      .addChoices(
        {
          name: 'M1',
          value: 1,
        },
        {
          name: 'M2',
          value: 2,
        },
        {
          name: 'M3',
          value: 3,
        },
        {
          name: 'M4',
          value: 4,
        },
        {
          name: 'M5',
          value: 5,
        },
        {
          name: 'M6',
          value: 6,
        },
        {
          name: 'M7',
          value: 7,
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

  const gameOngoing = await gameInfo.get('inPlay');
  if (!gameOngoing) {
    return interaction.reply({
      content: 'This command can only be used during an ongoing game.',
      ephemeral: true,
    });
  }

  const missionIndex = interaction.options.getInteger('mission');
  await interaction.reply({
    content: "Here's how that mission went!",
    ephemeral: true,
  });
  await sendVoteState(
    interaction.client,
    'current',
    missionIndex ? missionIndex : -1,
    interaction,
    true,
  );
}

module.exports = {
  data,
  execute,
};
