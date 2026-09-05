'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('kiss')
  .setDescription('Give your fave a little kiss')
  .addUserOption((option) =>
    option
      .setName('kissee')
      .setDescription('The player you want to kiss')
      .setRequired(true),
  );

async function execute(interaction, user) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }

  const targetKissee = interaction.options.getUser(`kissee`).id;

  const kisses = await gameInfo.get('kisses');

  if (interaction.user.id in kisses) {
    if (targetKissee in kisses[interaction.user.id]) {
      kisses[interaction.user.id][targetKissee] += 1;
    } else {
      kisses[interaction.user.id][targetKissee] = 1;
    }
  } else {
    kisses[interaction.user.id] = {};
    kisses[interaction.user.id][targetKissee] = 1;
  }

  if (
    kisses[interaction.user.id][targetKissee] &&
    kisses[targetKissee] &&
    kisses[targetKissee][interaction.user.id]
  ) {
    if (
      (kisses[interaction.user.id][targetKissee] === 1 &&
        kisses[targetKissee][interaction.user.id] >= 1) ||
      (kisses[interaction.user.id][targetKissee] >= 1 &&
        kisses[targetKissee][interaction.user.id] === 1)
    ) {
      return interaction.reply({
        content: `Wow, <@${interaction.user.id}> and <@${targetKissee}> just kissed... So cute.`,
        ephemeral: false,
      });
    } else if (
      kisses[interaction.user.id][targetKissee] +
        kisses[targetKissee][interaction.user.id] ===
      20
    ) {
      return interaction.reply({
        content: `OK <@${interaction.user.id}> and <@${targetKissee}> just get married already!`,
        ephemeral: false,
      });
    } else if (
      kisses[interaction.user.id][targetKissee] +
        kisses[targetKissee][interaction.user.id] >
      20
    ) {
      return interaction.reply({
        content: `OK that's enough kisses for <@${targetKissee}>.`,
        ephemeral: true,
      });
    } else if (
      kisses[interaction.user.id][targetKissee] > 1 &&
      kisses[targetKissee][interaction.user.id] > 1
    ) {
      return interaction.reply({
        content: `<@${interaction.user.id}> has given <@${targetKissee}> kiss #${kisses[interaction.user.id][targetKissee]}...`,
        ephemeral: false,
      });
    }
  } else {
    return interaction.reply({
      content: `You sent a kiss to <@${targetKissee}>... I wonder if they will send one too...`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
